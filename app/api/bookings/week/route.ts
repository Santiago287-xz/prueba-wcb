import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { addDays, isBefore, isAfter, getDay, format, differenceInDays } from "date-fns";
import { getServerSession } from "next-auth/next";
import { options as authOptions } from '../../auth/[...nextauth]/options';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    // Validate params
    if (!start || !end) {
      return NextResponse.json({ error: 'Missing start or end date' }, { status: 400 });
    }
    
    // Parse and normalize dates
    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);

    // Importante: ajusta el FINAL del día para cubrir zona horaria
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    // Agrega un día adicional al endDate para asegurar que se cubran todas las zonas horarias
    endDate.setDate(endDate.getDate() + 1);

    
    // Get all courts in a single query
    const courts = await prisma.court.findMany({
      select: {
        id: true,
        name: true,
        type: true
      }
    });
    
    if (!courts.length) {
      return NextResponse.json({ reservations: [], events: [] });
    }
    
    // Use Promise.all to run all queries in parallel
    const [nonRecurringRes, recurringRes, events] = await Promise.all([
      // Get all non-recurring reservations in one query
      prisma.courtReservation.findMany({
        where: {
          courtId: { in: courts.map(c => c.id) },
          status: "confirmed",
          isRecurring: false,
          OR: [
            {
              // Start time falls within range
              startTime: { gte: startDate, lte: endDate },
            },
            {
              // End time falls within range
              endTime: { gte: startDate, lte: endDate },
            },
            {
              // Reservation spans the entire range
              AND: [
                { startTime: { lt: startDate } },
                { endTime: { gt: endDate } }
              ]
            }
          ]
        },
        select: {
          id: true,
          courtId: true,
          name: true,
          phone: true,
          startTime: true,
          endTime: true,
          status: true,
          paymentMethod: true,
          isRecurring: true,
          recurrenceEnd: true,
          paidSessions: true,
          lastPaymentDate: true,
          paymentNotes: true
        }
      }),
      
      // Get all recurring reservations in one query with expanded date range
      prisma.courtReservation.findMany({
        where: {
          courtId: { in: courts.map(c => c.id) },
          status: "confirmed",
          isRecurring: true,
          startTime: { lte: endDate },
          OR: [
            { recurrenceEnd: null },
            { recurrenceEnd: { gte: startDate } }
          ]
        },
        select: {
          id: true,
          courtId: true,
          name: true,
          phone: true,
          startTime: true,
          endTime: true,
          status: true,
          paymentMethod: true,
          isRecurring: true,
          recurrenceEnd: true,
          paidSessions: true,
          lastPaymentDate: true,
          paymentNotes: true
        }
      }),
      
      // Get events - safely handle if the table doesn't exist
      prisma.event ? prisma.event.findMany({
        where: {
          date: { 
            gte: startDate,
            lte: endDate 
          },
        },
        select: {
          id: true,
          name: true,
          courtIds: true,
          date: true,
          startTime: true,
          endTime: true
        }
      }).catch(() => []) : Promise.resolve([])
    ]);
    
    // Create a court map for faster lookups
    const courtMap = Object.fromEntries(
      courts.map(court => [court.id, court])
    );
    
    // Add court info to non-recurring reservations
    const processedNonRecurringRes = nonRecurringRes.map(res => ({
      ...res,
      courtName: courtMap[res.courtId]?.name,
      courtType: courtMap[res.courtId]?.type,
      startTime: res.startTime.toISOString(),
      endTime: res.endTime.toISOString(),
      recurrenceEnd: res.recurrenceEnd ? res.recurrenceEnd.toISOString() : null,
      lastPaymentDate: res.lastPaymentDate ? res.lastPaymentDate.toISOString() : null
    }));
    
    // Generate virtual instances for recurring reservations
    const processedRecurringRes = [];
    
    for (const res of recurringRes) {
      const originalStart = new Date(res.startTime);
      const originalEnd = new Date(res.endTime);
      const weekDay = getDay(originalStart);
      const startHour = originalStart.getHours();
      const startMinute = originalStart.getMinutes();
      const duration = originalEnd.getTime() - originalStart.getTime();
      
      // Calculate how many days we need to check (add 1 to include the end date)
      const daysDifference = differenceInDays(endDate, startDate) + 1;
      
      for (let i = 0; i < daysDifference; i++) {
        const date = addDays(startDate, i);
        
        // Only process dates that match the weekday of the original reservation
        if (getDay(date) !== weekDay) continue;
        
        // Skip if date is before the original start date
        if (isBefore(date, originalStart)) continue;
        
        // Skip if reservation has an end date and this instance is after it
        if (res.recurrenceEnd && isAfter(date, res.recurrenceEnd)) continue;
        
        // Create the virtual instance
        const instanceStart = new Date(date);
        instanceStart.setHours(startHour, startMinute, 0, 0);
        
        const instanceEnd = new Date(instanceStart);
        instanceEnd.setTime(instanceStart.getTime() + duration);
        
        // Skip if this instance is outside our search range
        if (isAfter(instanceStart, endDate) || isBefore(instanceEnd, startDate)) continue;
        
        const virtualId = `${res.id}-${format(instanceStart, 'yyyy-MM-dd')}`;
        
        processedRecurringRes.push({
          ...res,
          startTime: instanceStart.toISOString(),
          endTime: instanceEnd.toISOString(),
          virtualId,
          isVirtualInstance: true,
          parentId: res.id,
          courtName: courtMap[res.courtId]?.name,
          courtType: courtMap[res.courtId]?.type,
          recurrenceEnd: res.recurrenceEnd ? res.recurrenceEnd.toISOString() : null,
          lastPaymentDate: res.lastPaymentDate ? res.lastPaymentDate.toISOString() : null
        });
      }
    }
    
    // Process events - carefully track courtIds to avoid duplicates
    const processedEvents = [];
    const processedEventIds = new Set();
    
    if (events && Array.isArray(events)) {
      for (const event of events) {
        // Skip events without courtIds
        if (!event.courtIds || !Array.isArray(event.courtIds) || event.courtIds.length === 0) {
          continue;
        }
        
        // Process each court in the event
        for (const courtId of event.courtIds) {
          const court = courtMap[courtId];
          if (!court) continue;
          
          // Create a unique ID to deduplicate
          const uniqueEventId = `event-${event.id}-${courtId}`;
          
          // Skip if we've already processed this event+court combination
          if (processedEventIds.has(uniqueEventId)) continue;
          processedEventIds.add(uniqueEventId);
          
          const eventStart = event.startTime || event.date;
          const eventEnd = event.endTime || new Date(new Date(event.date).setHours(23, 59, 59));
          
          processedEvents.push({
            id: uniqueEventId,
            name: event.name,
            courtId,
            courtName: court.name,
            courtType: court.type,
            startTime: eventStart.toISOString(),
            endTime: eventEnd.toISOString(),
            isEvent: true
          });
        }
      }
    }
    
    // Build the final response and add all necessary no-cache headers
    const allReservations = [...processedNonRecurringRes, ...processedRecurringRes];
    
    return NextResponse.json({
      reservations: allReservations,
      events: processedEvents,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Error fetching week data:', error);
    return NextResponse.json({ 
      error: 'Error fetching reservations',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}