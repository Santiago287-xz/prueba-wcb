// app/api/analytics/sales/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';
import { getServerSession } from "next-auth";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";

// Define types for maps
interface CategoryMap {
  [key: string]: number;
}

interface ProductItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface ProductMap {
  [key: string]: ProductItem;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id || !['admin', 'receptionist', 'court_manager'].includes(session.user.role as string)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');

  try {
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        product: {
          include: { category: true }
        }
      }
    });

    const total = sales.reduce((acc, sale) => acc + sale.total, 0);

    const categoryMap: CategoryMap = {};
    sales.forEach(sale => {
      const categoryName = sale.product.category.name;
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + sale.total;
    });

    const byCategory = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    }));

    const productMap: ProductMap = {};
    sales.forEach(sale => {
      const productId = sale.productId;
      if (!productMap[productId]) {
        productMap[productId] = {
          name: sale.product.name,
          quantity: 0,
          revenue: 0
        };
      }
      productMap[productId].quantity += sale.quantity;
      productMap[productId].revenue += sale.total;
    });

    const topProducts = Object.values(productMap)
      .sort((a: ProductItem, b: ProductItem) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      total,
      byCategory,
      topProducts
    });
  } catch (error) {
    console.error('Error in sales analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}