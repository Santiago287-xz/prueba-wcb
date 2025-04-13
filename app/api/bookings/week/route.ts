import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { addDays, isBefore, isAfter, getDay, format, differenceInDays } from "date-fns";
import { getServerSession } from "next-auth/next";
import { options as authOptions } from '../../auth/[...nextauth]/options';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
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
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);
    
    // Use a unique request id to prevent caching issues
    const requestId = Date.now().toString();
    
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
          startTime: { gte: startDate },
          endTime: { lte: endDate },
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
      
      // Get all recurring reservations in one query
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
      courtType: courtMap[res.courtId]?.type
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
      
      // Only calculate necessary days based on day of week
      const daysDifference = differenceInDays(endDate, startDate) + 1;
      
      for (let i = 0; i < daysDifference; i++) {
        const date = addDays(startDate, i);
        if (getDay(date) !== weekDay) continue;
        
        // Check if instance is valid
        if (isBefore(date, originalStart)) continue;
        if (res.recurrenceEnd && isAfter(date, res.recurrenceEnd)) continue;
        
        // Create the virtual instance
        const instanceStart = new Date(date);
        instanceStart.setHours(startHour, startMinute, 0, 0);
        
        const instanceEnd = new Date(instanceStart);
        instanceEnd.setTime(instanceStart.getTime() + duration);
        
        processedRecurringRes.push({
          ...res,
          startTime: instanceStart,
          endTime: instanceEnd,
          virtualId: `${res.id}-${format(instanceStart, 'yyyy-MM-dd')}`,
          isVirtualInstance: true,
          parentId: res.id,
          courtName: courtMap[res.courtId]?.name,
          courtType: courtMap[res.courtId]?.type
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
          
          processedEvents.push({
            id: uniqueEventId,
            name: event.name,
            courtId,
            courtName: court.name,
            courtType: court.type,
            startTime: event.startTime || event.date,
            endTime: event.endTime || new Date(new Date(event.date).setHours(23, 59, 59)),
            isEvent: true
          });
        }
      }
    }
    
    // Return all data with cache-busting headers
    return NextResponse.json({
      reservations: [...processedNonRecurringRes, ...processedRecurringRes],
      events: processedEvents,
      requestId // Add request ID to response for debugging
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Error fetching week data:', error);
    return NextResponse.json({ error: 'Error fetching reservations' }, { status: 500 });
  }
}