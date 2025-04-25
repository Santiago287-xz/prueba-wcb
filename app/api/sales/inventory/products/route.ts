import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

// GET: Listar todos los productos con su stock
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        stocks: true,
      },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

// POST: Crear un nuevo producto
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !['admin', 'court_manager', 'receptionist'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const priceStr = formData.get("price") as string;
    const categoryId = formData.get("categoryId") as string;

    // Obtener valores de stock
    const mainWarehouseStock = parseInt(formData.get("mainWarehouseStock") as string) || 0;
    const post1Stock = parseInt(formData.get("post1Stock") as string) || 0;
    const post2Stock = parseInt(formData.get("post2Stock") as string) || 0;

    // Validate inputs
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Nombre del producto es requerido" }, { status: 400 });
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Categoría es requerida" }, { status: 400 });
    }

    // Verify category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!categoryExists) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    // Use transaction for data integrity
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          description,
          price,
          categoryId,
        },
      });

      // Crear stock en las ubicaciones con las cantidades especificadas
      const stockLocations = [];

      if (mainWarehouseStock > 0) {
        const mainStock = await tx.stock.create({
          data: {
            productId: product.id,
            location: "main_warehouse",
            quantity: mainWarehouseStock,
            minStock: 5
          }
        });

        // Registrar el movimiento de stock inicial
        await tx.stockMovement.create({
          data: {
            stockId: mainStock.id,
            quantity: mainWarehouseStock,
            type: "initial_stock",
            userId: session.user.id
          }
        });

        stockLocations.push(mainStock);
      } else {
        // Crear registro de stock con cantidad 0 para el almacén principal
        const mainStock = await tx.stock.create({
          data: {
            productId: product.id,
            location: "main_warehouse",
            quantity: 0,
            minStock: 5
          }
        });
        stockLocations.push(mainStock);
      }

      if (post1Stock > 0) {
        const post1StockRecord = await tx.stock.create({
          data: {
            productId: product.id,
            location: "post_1",
            quantity: post1Stock,
            minStock: 3
          }
        });

        // Registrar el movimiento de stock inicial
        await tx.stockMovement.create({
          data: {
            stockId: post1StockRecord.id,
            quantity: post1Stock,
            type: "initial_stock",
            userId: session.user.id
          }
        });

        stockLocations.push(post1StockRecord);
      }

      if (post2Stock > 0) {
        const post2StockRecord = await tx.stock.create({
          data: {
            productId: product.id,
            location: "post_2",
            quantity: post2Stock,
            minStock: 3
          }
        });

        // Registrar el movimiento de stock inicial
        await tx.stockMovement.create({
          data: {
            stockId: post2StockRecord.id,
            quantity: post2Stock,
            type: "initial_stock",
            userId: session.user.id
          }
        });

        stockLocations.push(post2StockRecord);
      }

      return { product, stockLocations };
    });

    return NextResponse.json(result.product, { status: 201 });
  } catch (error) {
    console.error("Error al crear producto:", error);
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}

// PUT: Actualizar un producto
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const priceStr = formData.get("price") as string;
    const categoryId = formData.get("categoryId") as string | null;

    // Obtener valores de stock
    const mainWarehouseStock = parseInt(formData.get("mainWarehouseStock") as string) || 0;
    const post1Stock = parseInt(formData.get("post1Stock") as string) || 0;
    const post2Stock = parseInt(formData.get("post2Stock") as string) || 0;

    if (!id) {
      return NextResponse.json({ error: "ID del producto es requerido" }, { status: 400 });
    }

    // Verify product exists
    const productExists = await prisma.product.findUnique({
      where: { id },
      include: {
        stocks: true
      }
    });

    if (!productExists) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
    }

    // Build update data
    const updateData: any = {
      name,
      description,
      price,
    };

    // Add categoryId to update if provided
    if (categoryId) {
      // Verify category exists
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!categoryExists) {
        return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
      }

      updateData.categoryId = categoryId;
    }

    // Actualizar el producto y su stock en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar datos del producto
      const product = await tx.product.update({
        where: { id },
        data: updateData,
      });

      // Actualizar cantidades de stock
      // Para cada ubicación, verificamos si existe el registro
      const mainWarehouseStockExists = productExists.stocks.find(
        s => s.location === "main_warehouse"
      );

      if (mainWarehouseStockExists) {
        const oldQuantity = mainWarehouseStockExists.quantity;
        if (oldQuantity !== mainWarehouseStock) {
          await tx.stock.update({
            where: { id: mainWarehouseStockExists.id },
            data: { quantity: mainWarehouseStock },
          });

          // Registrar el movimiento de stock si hay cambio
          await tx.stockMovement.create({
            data: {
              stockId: mainWarehouseStockExists.id,
              quantity: mainWarehouseStock - oldQuantity,
              type: "admin_adjustment",
              userId: session.user.id
            }
          });
        }
      } else {
        const newStock = await tx.stock.create({
          data: {
            productId: id,
            location: "main_warehouse",
            quantity: mainWarehouseStock,
            minStock: 5
          },
        });

        if (mainWarehouseStock > 0) {
          await tx.stockMovement.create({
            data: {
              stockId: newStock.id,
              quantity: mainWarehouseStock,
              type: "initial_stock",
              userId: session.user.id
            }
          });
        }
      }

      const post1StockExists = productExists.stocks.find(
        s => s.location === "post_1"
      );

      if (post1StockExists) {
        const oldQuantity = post1StockExists.quantity;
        if (oldQuantity !== post1Stock) {
          await tx.stock.update({
            where: { id: post1StockExists.id },
            data: { quantity: post1Stock },
          });

          // Registrar el movimiento de stock si hay cambio
          await tx.stockMovement.create({
            data: {
              stockId: post1StockExists.id,
              quantity: post1Stock - oldQuantity,
              type: "admin_adjustment",
              userId: session.user.id
            }
          });
        }
      } else if (post1Stock > 0) {
        const newStock = await tx.stock.create({
          data: {
            productId: id,
            location: "post_1",
            quantity: post1Stock,
            minStock: 3
          },
        });

        await tx.stockMovement.create({
          data: {
            stockId: newStock.id,
            quantity: post1Stock,
            type: "initial_stock",
            userId: session.user.id
          }
        });
      }

      const post2StockExists = productExists.stocks.find(
        s => s.location === "post_2"
      );

      if (post2StockExists) {
        const oldQuantity = post2StockExists.quantity;
        if (oldQuantity !== post2Stock) {
          await tx.stock.update({
            where: { id: post2StockExists.id },
            data: { quantity: post2Stock },
          });

          // Registrar el movimiento de stock si hay cambio
          await tx.stockMovement.create({
            data: {
              stockId: post2StockExists.id,
              quantity: post2Stock - oldQuantity,
              type: "admin_adjustment",
              userId: session.user.id
            }
          });
        }
      } else if (post2Stock > 0) {
        const newStock = await tx.stock.create({
          data: {
            productId: id,
            location: "post_2",
            quantity: post2Stock,
            minStock: 3
          },
        });

        await tx.stockMovement.create({
          data: {
            stockId: newStock.id,
            quantity: post2Stock,
            type: "initial_stock",
            userId: session.user.id
          }
        });
      }

      return product;
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

// DELETE: Eliminar un producto
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID del producto es requerido" }, { status: 400 });
    }

    // Use transaction to ensure all related records are deleted
    await prisma.$transaction(async (tx) => {
      // Get all stocks for this product to delete related movements
      const stocks = await tx.stock.findMany({
        where: { productId: id }
      });

      // Delete stock movements for each stock
      for (const stock of stocks) {
        await tx.stockMovement.deleteMany({
          where: { stockId: stock.id }
        });
      }

      // Delete related stock records
      await tx.stock.deleteMany({
        where: { productId: id },
      });

      // Delete related sales (if any)
      await tx.sale.deleteMany({
        where: { productId: id }
      });

      // Finally delete the product
      await tx.product.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: "Producto eliminado" }, { status: 200 });
  } catch (error) {
    console.error("Error al eliminar producto:", error);
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}