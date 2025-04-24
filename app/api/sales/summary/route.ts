// app/api/sales/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const allowedRoles = ["admin", "receptionist", "court_manager"];
  if (!allowedRoles.includes(session.user.role as string)) {
    return NextResponse.json({ error: "No tienes permisos para ver estos datos" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json({ error: "Fechas de inicio y fin requeridas" }, { status: 400 });
    }

    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    // Obtener todas las ventas en el rango de fechas
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        product: true
      }
    });

    // Calcular ventas totales
    const totalSales = sales.reduce((acc, sale) => acc + sale.total, 0);
    
    // Ventas por método de pago
    const cashSales = sales
      .filter(sale => sale.paymentMethod === "cash")
      .reduce((acc, sale) => acc + sale.total, 0);
    
    const digitalSales = sales
      .filter(sale => sale.paymentMethod === "mercado_pago")
      .reduce((acc, sale) => acc + sale.total, 0);

    // Calcular productos más vendidos
    const productSales = sales.reduce((acc, sale) => {
      const productId = sale.productId;
      const productName = sale.product.name;
      
      if (!acc[productId]) {
        acc[productId] = {
          name: productName,
          total: 0,
          quantity: 0
        };
      }
      
      acc[productId].total += sale.total;
      acc[productId].quantity += sale.quantity;
      
      return acc;
    }, {} as Record<string, { name: string; total: number; quantity: number }>);

    // Convertir a array y ordenar por total
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10 productos

    // Ventas por puesto
    const salesByLocation = sales.reduce((acc, sale) => {
      const location = sale.location;
      
      if (!acc[location]) {
        acc[location] = 0;
      }
      
      acc[location] += sale.total;
      
      return acc;
    }, {} as Record<string, number>);

    // Ventas por día
    const salesByDay = sales.reduce((acc, sale) => {
      const day = sale.createdAt.toISOString().slice(0, 10);
      
      if (!acc[day]) {
        acc[day] = 0;
      }
      
      acc[day] += sale.total;
      
      return acc;
    }, {} as Record<string, number>);

    // Convertir a array y ordenar por fecha
    const dailySales = Object.entries(salesByDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalSales,
      cashSales,
      digitalSales,
      topProducts,
      salesByLocation,
      dailySales
    });
  } catch (error) {
    console.error("Error al obtener resumen de ventas:", error);
    return NextResponse.json({ error: "Error al obtener datos de ventas" }, { status: 500 });
  }
}