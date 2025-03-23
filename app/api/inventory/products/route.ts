import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Ensure upload directory exists
async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error("Error creating upload directory:", error);
  }
  return uploadDir;
}

// GET: Listar todos los productos con su stock
export async function GET(req: NextRequest) {
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
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const priceStr = formData.get("price") as string;
    const categoryId = formData.get("categoryId") as string;
    const file = formData.get("image") as File | null;

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

    let imagePath: string | undefined;
    if (file) {
      const uploadDir = await ensureUploadDir();
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      imagePath = `/uploads/${filename}`;
      await writeFile(path.join(uploadDir, filename), buffer);
    }

    // Use transaction for data integrity
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name,
          description,
          price,
          categoryId,
          image: imagePath,
        },
      });

      // Crear stock inicial en las tres ubicaciones
      await tx.stock.createMany({
        data: [
          { productId: product.id, location: "main_warehouse", quantity: 0, minStock: 5 },
          { productId: product.id, location: "post_1", quantity: 0, minStock: 3 },
          { productId: product.id, location: "post_2", quantity: 0, minStock: 3 },
        ],
      });

      return product;
    });

    return NextResponse.json(result, { status: 201 });
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
    const file = formData.get("image") as File | null;

    if (!id) {
      return NextResponse.json({ error: "ID del producto es requerido" }, { status: 400 });
    }

    // Verify product exists
    const productExists = await prisma.product.findUnique({
      where: { id },
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

    let imagePath: string | undefined;
    if (file) {
      const uploadDir = await ensureUploadDir();
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      imagePath = `/uploads/${filename}`;
      await writeFile(path.join(uploadDir, filename), buffer);
      updateData.image = imagePath;
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product, { status: 200 });
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
      // Delete related stock records first
      await tx.stock.deleteMany({
        where: { productId: id },
      });
      
      // Then delete the product
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