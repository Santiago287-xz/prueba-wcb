// app/api/analytics/attendance/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import { format, startOfWeek, endOfWeek } from 'date-fns';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  try {
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    
    const accessLogs = await prisma.accessLog.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
        status: "allowed"
      }
    });

    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayLogs = accessLogs.filter(log => 
      format(new Date(log.timestamp), 'yyyy-MM-dd') === todayStr
    );

    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    const weekLogs = accessLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= weekStart && logDate <= weekEnd;
    });

    const daysInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 1;
    const avgDaily = Math.round(accessLogs.length / daysInRange);

    const hourCounts = {};
    accessLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([hour]) => `${hour}:00`);

    const dayOfWeekCounts = {};
    accessLogs.forEach(log => {
      const dayOfWeek = new Date(log.timestamp).getDay();
      dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
    });

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const byDayOfWeek = Object.entries(dayOfWeekCounts).map(([day, count]) => ({
      day: dayNames[Number(day)],
      count
    }));

    return NextResponse.json({
      today: todayLogs.length,
      thisWeek: weekLogs.length,
      avgDaily,
      peakHours,
      byDayOfWeek
    });
  } catch (error) {
    console.error('Error in attendance analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}