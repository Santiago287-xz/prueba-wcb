import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { parseISO, differenceInDays, format, startOfMonth } from "date-fns";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accessPoints: true,
        membershipType: true,
        membershipStatus: true,
        level: true,
        goal: true,
        phone: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Obtener información de precios
    let membershipPrice = null;
    let pointUnitCost = 0;
    
    // Si el usuario tiene un tipo de membresía, buscar su precio
    if (user.membershipType) {
      membershipPrice = await prisma.membershipPrice.findFirst({
        where: { 
          type: user.membershipType,
          active: true
        }
      });
    }
    
    // Si no se encuentra precio específico, buscar el precio estándar
    if (!membershipPrice) {
      membershipPrice = await prisma.membershipPrice.findFirst({
        where: { 
          type: "standard",
          active: true
        }
      });
    }
    
    // Si aún no hay precio, buscar cualquier precio activo
    if (!membershipPrice) {
      membershipPrice = await prisma.membershipPrice.findFirst({
        where: { active: true },
        orderBy: { basePrice: 'asc' }
      });
    }

    // Calcular costo por punto
    if (membershipPrice) {
      // Si un plan mensual cuesta X y viene con 30 puntos estándar
      pointUnitCost = membershipPrice.basePrice / 30;
    } else {
      // Valor por defecto si no hay datos
      pointUnitCost = 1.00;
    }

    // Obtener historial de asistencia (logs)
    const accessLogs = await prisma.accessLog.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 50, // limitar a los últimos 50 registros
    });

    // Obtener ejercicios asignados
    const exercises = await prisma.userExercise.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        assignedAt: 'desc'
      },
      include: {
        exercise: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Calcular estadísticas para notificaciones
    const now = new Date();
    const daysForInactivity = 7; // Considerar inactivo después de 7 días sin asistencia
    
    // Días desde la última visita
    const lastVisit = accessLogs.length > 0 ? accessLogs[0].timestamp : null;
    const daysSinceLastVisit = lastVisit ? differenceInDays(now, lastVisit) : null;
    
    // Visitas en el mes actual
    const startOfCurrentMonth = startOfMonth(now);
    const visitsThisMonth = accessLogs.filter(log => 
      log.timestamp >= startOfCurrentMonth
    ).length;
    
    // Generar notificaciones basadas en la actividad y membresía
    const notifications = [];
    
    // Notificación por inactividad
    if (daysSinceLastVisit !== null && daysSinceLastVisit > daysForInactivity) {
      notifications.push({
        id: "inactivity",
        type: "warning",
        message: `No has visitado el gimnasio en ${daysSinceLastVisit} días. ¡Te esperamos pronto!`,
        timestamp: now.toISOString()
      });
    }
    
    // Notificación por pocos puntos
    if (user.accessPoints !== null && user.accessPoints <= 5 && user.accessPoints > 0) {
      notifications.push({
        id: "low-points",
        type: "warning",
        message: `Te quedan solo ${user.accessPoints} puntos. Considera recargar pronto.`,
        timestamp: now.toISOString()
      });
    }
    
    // Notificación por puntos agotados
    if (user.accessPoints !== null && user.accessPoints === 0) {
      notifications.push({
        id: "no-points",
        type: "error",
        message: "No tienes puntos disponibles. Recarga para seguir accediendo al gimnasio.",
        timestamp: now.toISOString()
      });
    }
    
    // Notificación por membresía inactiva
    if (user.membershipStatus === "inactive") {
      notifications.push({
        id: "inactive-membership",
        type: "error",
        message: "Tu membresía está inactiva. Contáctanos para activarla.",
        timestamp: now.toISOString()
      });
    }
    
    // Notificación por programa de ejercicios
    if (exercises.length === 0) {
      notifications.push({
        id: "no-exercises",
        type: "info",
        message: "No tienes un programa de ejercicios asignado. Consulta con un entrenador.",
        timestamp: now.toISOString()
      });
    } else {
      // Verificar si los ejercicios están actualizados (menos de 30 días)
      const oldestExerciseDate = exercises.reduce((oldest, ex) => 
        ex.assignedAt < oldest ? ex.assignedAt : oldest, 
        now
      );
      
      const daysSinceLastExerciseUpdate = differenceInDays(now, oldestExerciseDate);
      
      if (daysSinceLastExerciseUpdate > 30) {
        notifications.push({
          id: "old-exercise-plan",
          type: "info",
          message: "Tu plan de ejercicios no se ha actualizado en más de 30 días. Considera solicitar una actualización.",
          timestamp: now.toISOString()
        });
      }
    }
    
    // Notificación por buena asistencia
    if (visitsThisMonth >= 12) {
      notifications.push({
        id: "good-attendance",
        type: "success",
        message: `¡Excelente! Has visitado el gimnasio ${visitsThisMonth} veces este mes. ¡Sigue así!`,
        timestamp: now.toISOString()
      });
    }

    return NextResponse.json({
      user: {
        ...user,
        pointUnitCost: parseFloat(pointUnitCost.toFixed(2)),
        basePrice: membershipPrice?.basePrice || 0,
        pointsTotal: 30 // Valor de base para todos los usuarios
      },
      accessLogs,
      exercises,
      notifications,
      stats: {
        visitsThisMonth,
        daysSinceLastVisit,
        totalVisits: accessLogs.length
      }
    });
    
  } catch (error) {
    console.error("Error al obtener información del miembro:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}