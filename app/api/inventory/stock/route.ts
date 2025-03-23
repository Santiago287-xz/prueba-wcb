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

  try {
    const { stockId, quantity, type } = await req.json();
    
    // Validate inputs
    if (!stockId || typeof stockId !== 'string') {
      return NextResponse.json({ error: "ID de stock inválido" }, { status: 400 });
    }
    
    if (typeof quantity !== 'number' || quantity <= 0) {
      return NextResponse.json({ error: "Cantidad inválida" }, { status: 400 });
    }
    
    if (type !== "entry" && type !== "exit") {
      return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        where: { id: stockId },
        include: { product: true },
      });

      if (!stock) {
        throw new Error("Stock no encontrado");
      }

      // Validar que el empleado solo pueda modificar el stock de su puesto
      if (session.user.role === "employee") {
        if (session.user.post !== stock.location) {
          throw new Error("No autorizado para modificar este stock");
        }
      }

      const newQuantity = stock.quantity + (type === "entry" ? quantity : -quantity);

      if (newQuantity < 0) {
        throw new Error("Stock insuficiente");
      }

      // Actualizar el stock
      const updatedStock = await tx.stock.update({
        where: { id: stockId },
        data: { quantity: newQuantity },
      });

      // Registrar el movimiento
      await tx.stockMovement.create({
        data: {
          stockId,
          quantity: type === "entry" ? quantity : -quantity,
          type,
          userId: session.user.id,
        },
      });

      // Verificar si el stock está bajo
      if (newQuantity <= stock.minStock) {
        console.warn(`Alerta: Stock bajo de ${stock.product.name} en ${stock.location}: ${newQuantity} unidades`);
      }

      return updatedStock;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar stock:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar stock" }, { status: 500 });
  }
}