"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Sale {
  id: string;
  product: { name: string };
  quantity: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
}

export default function SalesReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [totalByPaymentMethod, setTotalByPaymentMethod] = useState<Record<string, number>>({
    cash: 0,
    mercado_pago: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    
    if (session?.user?.role !== "employee" || !session?.user?.post) {
      setError("No tienes permisos para acceder a esta página o no tienes un puesto asignado");
      return;
    }
    
    fetchSales();
  }, [date, session, status, router]);

  const fetchSales = async () => {
    if (!session?.user?.post) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/sales?date=${date}&location=${session.user.post}`);
      
      if (!res.ok) {
        throw new Error(`Error: ${res.status} - ${res.statusText}`);
      }
      
      const data = await res.json();
      setSales(data.sales || []);
      setTotal(data.total || 0);
      setTotalByPaymentMethod({
        cash: data.totalByPaymentMethod?.cash || 0,
        mercado_pago: data.totalByPaymentMethod?.mercado_pago || 0
      });
    } catch (error) {
      console.error("Error al obtener ventas:", error);
      setError("Error al cargar los datos de ventas. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Loading session state
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando sesión...</p>
      </div>
    );
  }

  // Handle different error states separately
  if (!session?.user) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">No autorizado</h1>
        <p>Debes iniciar sesión para acceder a esta página.</p>
        <button 
          onClick={() => router.push("/signin")}
          className="mt-4 bg-primary text-white p-2 rounded"
        >
          Iniciar sesión
        </button>
      </div>
    );
  }
  
  if (session.user.role !== "employee") {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">No autorizado</h1>
        <p>Solo los empleados pueden acceder a los reportes de ventas.</p>
        <p className="mt-2">Tu rol actual es: <span className="font-semibold">{session.user.role}</span></p>
        <button 
          onClick={() => router.push("/")}
          className="mt-4 bg-primary text-white p-2 rounded"
        >
          Volver al inicio
        </button>
      </div>
    );
  }
  
  if (!session.user.post) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-amber-600 mb-4">Puesto no asignado</h1>
        <p>No tienes un puesto de trabajo asignado. Contacta con un administrador para que te asigne a:</p>
        <div className="mt-4 flex flex-col gap-2 items-center">
          <div className="border border-amber-200 bg-amber-50 rounded p-3 w-60">
            <p className="font-semibold">Puesto 1 (post_1)</p>
            <p className="text-sm">Reportes del Puesto 1</p>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded p-3 w-60">
            <p className="font-semibold">Puesto 2 (post_2)</p>
            <p className="text-sm">Reportes del Puesto 2</p>
          </div>
        </div>
        <button 
          onClick={() => router.push("/")}
          className="mt-6 bg-primary text-white p-2 rounded"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Cierre de Caja - {session.user.post}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block mb-2">Fecha:</label>
        <div className="flex items-center">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded mr-2"
          />
          <button 
            onClick={fetchSales}
            className="bg-primary text-white p-2 rounded"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                Cargando...
              </span>
            ) : (
              "Buscar"
            )}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Ventas del Día</h2>
        {loading ? (
          <div className="flex justify-center my-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sales.length === 0 ? (
          <p>No hay ventas registradas para esta fecha.</p>
        ) : (
          <div className="overflow-x-auto">
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
                    <td className="border p-2">${sale.total.toFixed(2)}</td>
                    <td className="border p-2">{sale.paymentMethod === "cash" ? "Efectivo" : "Mercado Pago"}</td>
                    <td className="border p-2">{format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gray-100 p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Resumen</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold text-lg">Total Vendido</h3>
            <p className="text-2xl font-bold">${total.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold text-lg">Efectivo</h3>
            <p className="text-2xl font-bold">${totalByPaymentMethod.cash.toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold text-lg">Mercado Pago</h3>
            <p className="text-2xl font-bold">${totalByPaymentMethod.mercado_pago.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}