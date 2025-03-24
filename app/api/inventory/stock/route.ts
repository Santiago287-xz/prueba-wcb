import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from "@/app/libs/prismadb";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { productId, post1Quantity, post2Quantity } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "ID del producto es requerido" }, { status: 400 });
    }

    // Validate input quantities
    const post1QuantityNum = parseInt(post1Quantity) || 0;
    const post2QuantityNum = parseInt(post2Quantity) || 0;

    if (post1QuantityNum < 0 || post2QuantityNum < 0) {
      return NextResponse.json({ error: "Las cantidades deben ser números positivos" }, { status: 400 });
    }

    const totalTransferQuantity = post1QuantityNum + post2QuantityNum;
    if (totalTransferQuantity <= 0) {
      return NextResponse.json({ error: "Debe transferir al menos un producto" }, { status: 400 });
    }

    // Use transaction to ensure data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Get current stock in main warehouse
      const mainWarehouseStock = await tx.stock.findFirst({
        where: { 
          productId, 
          location: "main_warehouse" 
        }
      });

      if (!mainWarehouseStock) {
        throw new Error(`No se encontró stock en almacén principal para el producto ${productId}`);
      }

      if (mainWarehouseStock.quantity < totalTransferQuantity) {
        throw new Error(`Stock insuficiente en almacén principal. Disponible: ${mainWarehouseStock.quantity}, Solicitado: ${totalTransferQuantity}`);
      }

      // Update main warehouse stock
      await tx.stock.update({
        where: { id: mainWarehouseStock.id },
        data: { 
          quantity: mainWarehouseStock.quantity - totalTransferQuantity 
        }
      });

      // Register the stock reduction movement
      await tx.stockMovement.create({
        data: {
          stockId: mainWarehouseStock.id,
          quantity: -totalTransferQuantity,
          type: "transfer_out",
          userId: session.user.id
        }
      });

      // Update Post 1 stock if needed
      if (post1QuantityNum > 0) {
        const post1Stock = await tx.stock.findFirst({
          where: { 
            productId, 
            location: "post_1" 
          }
        });

        if (post1Stock) {
          await tx.stock.update({
            where: { id: post1Stock.id },
            data: { 
              quantity: post1Stock.quantity + post1QuantityNum 
            }
          });

          // Register the stock increase movement
          await tx.stockMovement.create({
            data: {
              stockId: post1Stock.id,
              quantity: post1QuantityNum,
              type: "transfer_in",
              userId: session.user.id
            }
          });
        } else {
          // Create new stock entry for post_1
          const newPost1Stock = await tx.stock.create({
            data: {
              productId,
              location: "post_1",
              quantity: post1QuantityNum,
              minStock: 3
            }
          });

          // Register the stock creation movement
          await tx.stockMovement.create({
            data: {
              stockId: newPost1Stock.id,
              quantity: post1QuantityNum,
              type: "transfer_in",
              userId: session.user.id
            }
          });
        }
      }

      // Update Post 2 stock if needed
      if (post2QuantityNum > 0) {
        const post2Stock = await tx.stock.findFirst({
          where: { 
            productId, 
            location: "post_2" 
          }
        });

        if (post2Stock) {
          await tx.stock.update({
            where: { id: post2Stock.id },
            data: { 
              quantity: post2Stock.quantity + post2QuantityNum 
            }
          });

          // Register the stock increase movement
          await tx.stockMovement.create({
            data: {
              stockId: post2Stock.id,
              quantity: post2QuantityNum,
              type: "transfer_in",
              userId: session.user.id
            }
          });
        } else {
          // Create new stock entry for post_2
          const newPost2Stock = await tx.stock.create({
            data: {
              productId,
              location: "post_2",
              quantity: post2QuantityNum,
              minStock: 3
            }
          });

          // Register the stock creation movement
          await tx.stockMovement.create({
            data: {
              stockId: newPost2Stock.id,
              quantity: post2QuantityNum,
              type: "transfer_in",
              userId: session.user.id
            }
          });
        }
      }

      return {
        success: true,
        message: "Stock transferido correctamente",
        transferred: {
          post1: post1QuantityNum,
          post2: post2QuantityNum,
          total: totalTransferQuantity
        }
      };
    });

    return NextResponse.json({ 
      message: "Stock transferido con éxito", 
      data: result 
    }, { status: 200 });

  } catch (error) {
    console.error("Error al transferir stock:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al transferir stock";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}