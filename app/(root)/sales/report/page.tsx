"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

interface Sale {
  id: string;
  product: { name: string };
  quantity: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

export default function SalesReportPage() {
  const { data: session } = useSession();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [totalByPaymentMethod, setTotalByPaymentMethod] = useState<Record<string, number>>({});

  useEffect(() => {
    if (session?.user?.post) {
      fetchSales();
    }
  }, [date, session]);

  const fetchSales = async () => {
    const res = await fetch(`/api/sales?date=${date}&location=${session?.user?.post}`);
    const data = await res.json();
    setSales(data.sales);
    setTotal(data.total);
    setTotalByPaymentMethod(data.totalByPaymentMethod);
  };

  if (!session?.user || session.user.role !== "employee") {
    return <div>No autorizado</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Cierre de Caja - {session.user.post}</h1>

      <div className="mb-6">
        <label className="block mb-2">Fecha:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border p-2 rounded"
        />
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Ventas del Día</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Producto</th>
              <th className="border p-2">Cantidad</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Método de Pago</th>
              <th className="border p-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="border p-2">{sale.product.name}</td>
                <td className="border p-2">{sale.quantity}</td>
                <td className="border p-2">${sale.total}</td>
                <td className="border p-2">{sale.paymentMethod === "cash" ? "Efectivo" : "Mercado Pago"}</td>
                <td className="border p-2">{format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Resumen</h2>
        <p>Total Vendido: ${total}</p>
        <p>Efectivo: ${totalByPaymentMethod.cash || 0}</p>
        <p>Mercado Pago: ${totalByPaymentMethod.mercado_pago || 0}</p>
      </div>
    </div>
  );
}