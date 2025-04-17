// app/api/analytics/financial/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import { format, startOfWeek, endOfWeek, startOfMonth, subDays } from 'date-fns';
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'employee'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  try {
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    
    // Fechas para estadísticas específicas
    const today = new Date();
    const thisWeekStart = startOfWeek(today);
    const thisWeekEnd = endOfWeek(today);
    const thisMonthStart = startOfMonth(today);
    
    // 1. Obtener transacciones para el período
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });
    
    // 2. Calcular métricas por área
    const areas = {
      gym: { totalIncome: 0, totalExpense: 0, netProfit: 0, transactionCount: 0 },
      courts: { totalIncome: 0, totalExpense: 0, netProfit: 0, transactionCount: 0 },
      shop: { totalIncome: 0, totalExpense: 0, netProfit: 0, transactionCount: 0 }
    };
    
    transactions.forEach(t => {
      let area = 'shop'; // Default
      
      if (t.category.includes('gym') || 
          t.category.includes('membership') || 
          t.category.includes('point')) {
        area = 'gym';
      } else if (t.category.includes('court') || 
                t.category === 'court_rental' ||
                t.category.includes('booking')) {
        area = 'courts';
      } else if (t.category.includes('product') || 
                t.category.includes('food') || 
                t.category.includes('drink') ||
                t.category.includes('sale')) {
        area = 'shop';
      }
      
      if (t.type === 'income') {
        areas[area].totalIncome += t.amount;
      } else {
        areas[area].totalExpense += t.amount;
      }
      
      areas[area].transactionCount++;
    });
    
    // Calcular ganancias netas
    areas.gym.netProfit = areas.gym.totalIncome - areas.gym.totalExpense;
    areas.courts.netProfit = areas.courts.totalIncome - areas.courts.totalExpense;
    areas.shop.netProfit = areas.shop.totalIncome - areas.shop.totalExpense;
    
    // 3. Obtener datos del gimnasio
    const gymAccessLogs = await prisma.accessLog.findMany({
      where: {
        status: "allowed",
        timestamp: { gte: subDays(today, 30) }
      }
    });
    
    const todayAccess = gymAccessLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return format(logDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
    }).length;
    
    const thisWeekAccess = gymAccessLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= thisWeekStart && logDate <= thisWeekEnd;
    }).length;
    
    const thisMonthAccess = gymAccessLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= thisMonthStart;
    }).length;
    
    // Accesos por hora
    const accessByHour = {};
    gymAccessLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      accessByHour[hour] = (accessByHour[hour] || 0) + 1;
    });
    
    const accessHourlyData = Object.entries(accessByHour).map(([hour, count]) => ({
      hour: `${hour}:00`,
      count
    })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
    
    // Accesos por día de la semana
    const dayOfWeekMap = {
      0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 
      4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
    };
    
    const accessByDay = {};
    gymAccessLogs.forEach(log => {
      const day = new Date(log.timestamp).getDay();
      accessByDay[day] = (accessByDay[day] || 0) + 1;
    });
    
    const accessDailyData = Object.entries(accessByDay).map(([day, count]) => ({
      day: dayOfWeekMap[parseInt(day)],
      count
    }));
    
    // 4. Obtener datos de puntos del gimnasio
    const gymPointsTransactions = transactions.filter(t => 
      t.type === 'income' && 
      (t.category.includes('point') || t.category.includes('membership'))
    );
    
    // Total de puntos vendidos (ingresos)
    const totalPointsRevenue = gymPointsTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Puntos usados
    const usedPoints = await prisma.accessLog.count({
      where: {
        status: "allowed",
        pointsDeducted: { gt: 0 },
        timestamp: { gte: startDate, lte: endDate }
      }
    });
    
    // Tipos específicos de paquetes de puntos
    const pointPackages = [
      { name: 'Básico', points: 30, count: 0, revenue: 0 },
      { name: 'Estándar', points: 60, count: 0, revenue: 0 },
      { name: 'Premium', points: 100, count: 0, revenue: 0 }
    ];
    
    // Asignar transacciones de puntos a sus categorías correspondientes
    gymPointsTransactions.forEach(t => {
      // Intentar determinar qué tipo de paquete fue por el monto o descripción
      let packageIndex = 0;
      
      if (t.description) {
        const desc = t.description.toLowerCase();
        if (desc.includes('premium') || desc.includes('100')) {
          packageIndex = 2;
        } else if (desc.includes('estándar') || desc.includes('estandar') || desc.includes('60')) {
          packageIndex = 1;
        }
      } else {
        // Si no hay descripción, intentar por monto
        // Esta lógica puede ajustarse según los precios reales
        if (t.amount > 8000) {
          packageIndex = 2; // Premium
        } else if (t.amount > 4000) {
          packageIndex = 1; // Estándar
        }
      }
      
      pointPackages[packageIndex].count++;
      pointPackages[packageIndex].revenue += t.amount;
    });
    
    // 5. Crear datos de comparación financiera
    const dateMap = {};
    transactions.forEach(t => {
      const date = format(new Date(t.createdAt), 'yyyy-MM-dd');
      if (!dateMap[date]) {
        dateMap[date] = { income: 0, expense: 0 };
      }
      
      if (t.type === 'income') {
        dateMap[date].income += t.amount;
      } else {
        dateMap[date].expense += t.amount;
      }
    });
    
    const financialComparison = Object.entries(dateMap).map(([date, values]) => ({
      date,
      income: values.income,
      expense: values.expense,
      balance: values.income - values.expense
    })).sort((a, b) => a.date.localeCompare(b.date));
    // Crear respuesta consolidada
    return NextResponse.json({
      areas,
      gymAccess: {
        today: todayAccess,
        thisWeek: thisWeekAccess,
        thisMonth: thisMonthAccess,
        byHour: accessHourlyData,
        byDay: accessDailyData
      },
      gymPoints: {
        totalPointsSold: totalPointsRevenue,
        totalPointsUsed: usedPoints,
        pointPackagesSold: pointPackages
      },
      financialComparison
    });
    
  } catch (error) {
    console.error('Error in enhanced analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}