import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismadb";

// POST: Agregar nuevo stock al almacén principal
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { productId, quantity } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "ID del producto es requerido" }, { status: 400 });
    }

    // Validate input quantity
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return NextResponse.json({ error: "La cantidad debe ser un número positivo" }, { status: 400 });
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Check if product exists
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error(`Producto con ID ${productId} no encontrado`);
      }

      // Get current stock in main warehouse
      const mainWarehouseStock = await tx.stock.findFirst({
        where: { 
          productId, 
          location: "main_warehouse" 
        }
      });

      if (mainWarehouseStock) {
        // Update existing stock
        const updatedStock = await tx.stock.update({
          where: { id: mainWarehouseStock.id },
          data: { 
            quantity: mainWarehouseStock.quantity + quantityNum 
          }
        });

        // Register the stock movement
        await tx.stockMovement.create({
          data: {
            stockId: mainWarehouseStock.id,
            quantity: quantityNum,
            type: "stock_addition",
            userId: session.user.id
          }
        });

        return {
          success: true,
          product: product.name,
          previousQuantity: mainWarehouseStock.quantity,
          newQuantity: updatedStock.quantity,
          added: quantityNum
        };
      } else {
        // Create new stock entry for main warehouse
        const newStock = await tx.stock.create({
          data: {
            productId,
            location: "main_warehouse",
            quantity: quantityNum,
            minStock: 5
          }
        });

        // Register the stock movement
        await tx.stockMovement.create({
          data: {
            stockId: newStock.id,
            quantity: quantityNum,
            type: "initial_stock",
            userId: session.user.id
          }
        });

        return {
          success: true,
          product: product.name,
          previousQuantity: 0,
          newQuantity: quantityNum,
          added: quantityNum
        };
      }
    });

    return NextResponse.json({ 
      message: "Stock agregado con éxito", 
      data: result 
    }, { status: 200 });

  } catch (error) {
    console.error("Error al agregar stock:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al agregar stock";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}