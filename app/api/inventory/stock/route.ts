import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

// POST: Actualizar stock (entrada o salida)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "admin" && session.user.role !== "employee")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { stockId, quantity, type } = await req.json();

  const stock = await prisma.stock.findUnique({
    where: { id: stockId },
    include: { product: true },
  });

  if (!stock) {
    return NextResponse.json({ error: "Stock no encontrado" }, { status: 404 });
  }

  // Validar que el empleado solo pueda modificar el stock de su puesto
  if (session.user.role === "employee") {
    if (session.user.post !== stock.location) {
      return NextResponse.json({ error: "No autorizado para modificar este stock" }, { status: 403 });
    }
  }

  const newQuantity = stock.quantity + (type === "entry" ? quantity : -quantity);

  if (newQuantity < 0) {
    return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 });
  }

  // Actualizar el stock
  const updatedStock = await prisma.stock.update({
    where: { id: stockId },
    data: { quantity: newQuantity },
  });

  // Registrar el movimiento
  await prisma.stockMovement.create({
    data: {
      stockId,
      quantity: type === "entry" ? quantity : -quantity,
      type,
      userId: session.user.id,
    },
  });

  // Generar notificación si el stock está por debajo del mínimo
  if (newQuantity <= stock.minStock) {
    await prisma.notification.create({
      data: {
        notification_text: `Quedan ${newQuantity} unidades de ${stock.product.name} en ${stock.location}`,
        type: "stock_alert",
        userId: session.user.id,
        pathName: "/inventory",
      },
    });
  }

  return NextResponse.json(updatedStock, { status: 200 });
}