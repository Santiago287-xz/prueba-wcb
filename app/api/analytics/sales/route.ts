// app/api/analytics/sales/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/app/libs/prismadb';

export async function GET(request: Request) {
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

    const categoryMap = {};
    sales.forEach(sale => {
      const categoryName = sale.product.category.name;
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + sale.total;
    });

    const byCategory = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    }));

    const productMap = {};
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
      .sort((a, b) => b.revenue - a.revenue)
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