import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

// POST: Registrar una venta
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !session?.user?.post) {
    return NextResponse.json({ error: "No autorizado o ubicación no definida" }, { status: 401 });
  }

  try {
    const { items, paymentMethod } = await req.json();
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Formato de items inválido" }, { status: 400 });
    }

    // Validate payment method
    if (paymentMethod !== "cash" && paymentMethod !== "mercado_pago") {
      return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
    }

    // Use a transaction to ensure data integrity
    const sales = await prisma.$transaction(async (tx) => {
      const salesResult = [];
      
      for (const item of items) {
        if (!item.productId || typeof item.quantity !== 'number' || item.quantity <= 0) {
          throw new Error(`Datos inválidos para un item: ${JSON.stringify(item)}`);
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { stocks: true },
        });

        if (!product) {
          throw new Error(`Producto ${item.productId} no encontrado`);
        }

        const stock = product.stocks.find((s) => s.location === session.user.post);
        if (!stock) {
          throw new Error(`Stock no encontrado para ${product.name}`);
        }

        if (stock.quantity < item.quantity) {
          throw new Error(`Stock insuficiente para ${product.name}`);
        }

        // Crear la venta
        const sale = await tx.sale.create({
          data: {
            productId: product.id,
            quantity: item.quantity,
            total: product.price * item.quantity,
            paymentMethod,
            location: session.user.post as "post_1" | "post_2",
            userId: session.user.id,
          },
        });

        // Actualizar el stock
        await tx.stock.update({
          where: { id: stock.id },
          data: { quantity: stock.quantity - item.quantity },
        });

        // Registrar el movimiento
        await tx.stockMovement.create({
          data: {
            stockId: stock.id,
            quantity: -item.quantity,
            type: "exit",
            userId: session.user.id,
          },
        });

        // Verificar si el stock está bajo después de la venta
        const newQuantity = stock.quantity - item.quantity;
        if (newQuantity <= stock.minStock) {
          console.warn(`Alerta: Stock bajo de ${product.name} en ${stock.location}: ${newQuantity} unidades`);
        }

        salesResult.push(sale);
      }

      return salesResult;
    });

    return NextResponse.json(sales, { status: 201 });
  } catch (error) {
    console.error("Error al procesar la venta:", error);
    const message = error instanceof Error ? error.message : "Error al procesar la venta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: Obtener ventas para el cierre de caja
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date"); // Ejemplo: "2025-03-18"
    const location = searchParams.get("location"); // "post_1" o "post_2"

    if (!date || !location) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        location: location as "post_1" | "post_2",
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { product: true },
    });

    const total = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalByPaymentMethod = sales.reduce(
      (acc, sale) => {
        acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({ 
      sales, 
      total, 
      totalByPaymentMethod: {
        cash: totalByPaymentMethod.cash || 0,
        mercado_pago: totalByPaymentMethod.mercado_pago || 0
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Error al obtener ventas:", error);
    const message = error instanceof Error ? error.message : "Error al obtener ventas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}