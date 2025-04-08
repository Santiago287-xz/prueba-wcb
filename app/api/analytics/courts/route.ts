// app/api/analytics/courts/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import { format } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  try {
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const reservations = await prisma.courtReservation.findMany({
      where: {
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: "confirmed"
      },
      include: {
        court: true
      }
    });

    // Calculate revenue (using transaction data if available)
    const transactions = await prisma.transaction.findMany({
      where: {
        reservationId: { in: reservations.map(r => r.id) },
        type: "income"
      }
    });
    const revenue = transactions.reduce((acc, t) => acc + t.amount, 0);

    // Popular Times
    const popularTimesMap = {};
    reservations.forEach(res => {
      const hour = new Date(res.startTime).getHours().toString();
      popularTimesMap[hour] = (popularTimesMap[hour] || 0) + 1;
    });
    const popularTimes = Object.keys(popularTimesMap).map(hour => ({
      hour,
      reservations: popularTimesMap[hour]
    }));

    // Popular Courts
    const courts = await prisma.court.findMany();
    const courtsMap = {};
    reservations.forEach(res => {
      courtsMap[res.courtId] = (courtsMap[res.courtId] || 0) + 1;
    });
    const popularCourts = Object.keys(courtsMap).map(courtId => {
      const court = courts.find(c => c.id === courtId);
      return {
        courtId,
        name: court?.name || 'Unknown',
        type: court?.type || 'Unknown',
        reservations: courtsMap[courtId]
      };
    });

    // Utilization by Day
    const utilizationByDayMap = {};
    reservations.forEach(res => {
      const day = format(new Date(res.startTime), 'yyyy-MM-dd');
      if (!utilizationByDayMap[day]) {
        utilizationByDayMap[day] = { futbol: 0, padel: 0 };
      }
      const type = res.court.type.toLowerCase();
      if (type.includes('futbol') || type.includes('fútbol')) {
        utilizationByDayMap[day].futbol += 1;
      } else if (type.includes('padel') || type.includes('pádel')) {
        utilizationByDayMap[day].padel += 1;
      }
    });
    const utilizationByDay = Object.entries(utilizationByDayMap).map(([day, data]) => ({
      day: format(new Date(day), 'dd/MM'),
      ...data
    }));

    // Top Clients
    const clientsMap = {};
    reservations.forEach(res => {
      if (res.name) {
        clientsMap[res.name] = (clientsMap[res.name] || 0) + 1;
      }
    });
    const topClients = Object.entries(clientsMap)
      .map(([name, reservations]) => ({ name, reservations }))
      .sort((a, b) => b.reservations - a.reservations)
      .slice(0, 10);

    const totalPossibleSlots = courts.length * 12 * 7;
    const utilization = Math.round((reservations.length / totalPossibleSlots) * 100);

    return NextResponse.json({
      utilization,
      revenue,
      popularTimes,
      popularCourts,
      utilizationByDay,
      topClients
    });
  } catch (error) {
    console.error('Error in courts analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}