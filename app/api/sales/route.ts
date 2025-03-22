import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

// POST: Registrar una venta
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const { items, paymentMethod } = await req.json();
  // items: [{ productId, quantity }]

  const sales = [];
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { stocks: true },
    });

    if (!product) {
      return NextResponse.json({ error: `Producto ${item.productId} no encontrado` }, { status: 404 });
    }

    const stock = product.stocks.find((s) => s.location === session?.user.post);
    if (!stock) {
      return NextResponse.json({ error: `Stock no encontrado para ${product.name}` }, { status: 404 });
    }

    if (stock.quantity < item.quantity) {
      return NextResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 400 });
    }

    // Crear la venta
    const sale = await prisma.sale.create({
      data: {
        productId: product.id,
        quantity: item.quantity,
        total: product.price * item.quantity,
        paymentMethod,
        location: session?.user.post as "post_1" | "post_2",
        userId: session?.user.id,
      },
    });

    // Actualizar el stock
    await prisma.stock.update({
      where: { id: stock.id },
      data: { quantity: stock.quantity - item.quantity },
    });

    // Registrar el movimiento
    await prisma.stockMovement.create({
      data: {
        stockId: stock.id,
        quantity: -item.quantity,
        type: "exit",
        userId: session?.user.id,
      },
    });

    // Generar notificación si el stock está por debajo del mínimo
    const newQuantity = stock.quantity - item.quantity;
    if (newQuantity <= stock.minStock) {
      await prisma.notification.create({
        data: {
          notification_text: `Quedan ${newQuantity} unidades de ${product.name} en ${stock.location}`,
          type: "stock_alert",
          userId: session.user.id,
          pathName: "/inventory",
        },
      });
    }

    sales.push(sale);
  }

  return NextResponse.json(sales, { status: 201 });
}

// GET: Obtener ventas para el cierre de caja
export async function GET(req: NextRequest) {
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

  return NextResponse.json({ sales, total, totalByPaymentMethod }, { status: 200 });
}