import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { writeFile } from "fs/promises";
import path from "path";

// GET: Listar todos los productos con su stock
export async function GET(req: NextRequest) {
  const products = await prisma.product.findMany({
    include: {
      category: true,
      stocks: true,
    },
  });

  return NextResponse.json(products, { status: 200 });
}

// POST: Crear un nuevo producto
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const categoryId = formData.get("categoryId") as string;
  const file = formData.get("image") as File;

  let imagePath: string | undefined;
  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    imagePath = `/uploads/${filename}`;
    await writeFile(path.join(uploadDir, filename), buffer);
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      price,
      categoryId,
      image: imagePath,
    },
  });

  // Crear stock inicial en las tres ubicaciones
  await prisma.stock.createMany({
    data: [
      { productId: product.id, location: "main_warehouse", quantity: 0 },
      { productId: product.id, location: "post_1", quantity: 0 },
      { productId: product.id, location: "post_2", quantity: 0 },
    ],
  });

  return NextResponse.json(product, { status: 201 });
}

// PUT: Actualizar un producto
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const file = formData.get("image") as File;

  let imagePath: string | undefined;
  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    imagePath = `/uploads/${filename}`;
    await writeFile(path.join(uploadDir, filename), buffer);
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name,
      description,
      price,
      image: imagePath,
    },
  });

  return NextResponse.json(product, { status: 200 });
}

// DELETE: Eliminar un producto
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await req.json();

  await prisma.product.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Producto eliminado" }, { status: 200 });
}