"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: number;
  stocks: { id: string; location: string; quantity: number }[];
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export default function SalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mercado_pago">("cash");
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    
    if (session?.user?.role !== "employee" || !session?.user?.post) {
      setError("No tienes permisos para acceder a esta página o no tienes un puesto asignado");
      setLoading(false);
      return;
    }
    
    fetchProducts();
  }, [session, status, router]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/inventory/products");
      if (!res.ok) {
        throw new Error(`Error: ${res.status} - ${res.statusText}`);
      }
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      setError("Error al cargar los productos. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    if (!session?.user?.post) {
      setError("No tienes un puesto asignado");
      return;
    }

    const stock = product.stocks.find((s) => s.location === session.user.post);
    
    if (!stock) {
      setError(`No se encontró stock para ${product.name} en tu ubicación`);
      return;
    }

    if (stock.quantity <= 0) {
      setError(`No hay stock disponible para ${product.name}`);
      return;
    }

    setCart((prev) => {
      const existingItem = prev.find((item) => item.productId === product.id);
      if (existingItem) {
        if (existingItem.quantity + 1 > stock.quantity) {
          setError(`Stock insuficiente para ${product.name}`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, price: product.price }];
    });
    
    // Clear any previous error
    setError(null);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId);
      if (item && item.quantity > 1) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
        );
      }
      return prev.filter((i) => i.productId !== productId);
    });
  };

  const handleSale = async () => {
    if (cart.length === 0) {
      setError("El carrito está vacío");
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, paymentMethod }),
      });

      const data = await res.json();

      if (res.ok) {
        setCart([]);
        fetchProducts();
        alert("Venta registrada con éxito");
      } else {
        setError(`Error: ${data.error || "No se pudo procesar la venta"}`);
      }
    } catch (error) {
      console.error("Error al registrar la venta:", error);
      setError("Error de conexión. Por favor, intenta nuevamente.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Loading state
  if (status === "loading" || (loading && !error)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando...</p>
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
        <p>Solo los empleados pueden acceder al sistema de ventas.</p>
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
            <p className="text-sm">Ventas del Puesto 1</p>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded p-3 w-60">
            <p className="font-semibold">Puesto 2 (post_2)</p>
            <p className="text-sm">Ventas del Puesto 2</p>
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
      <h1 className="text-3xl font-bold mb-6">Ventas - {session.user.post}</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Lista de productos */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Productos Disponibles</h2>
        {products.length === 0 ? (
          <p>No hay productos disponibles.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map((product) => {
              const stock = product.stocks.find((s) => s.location === session.user.post);
              return (
                <div key={product.id} className="border p-4 rounded shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold">{product.name}</h3>
                  <p>Precio: ${product.price.toFixed(2)}</p>
                  <p>Stock: {stock?.quantity || 0}</p>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-green-500 hover:bg-green-600 text-white p-2 rounded mt-2 transition-colors"
                    disabled={!stock || stock.quantity <= 0}
                  >
                    Agregar al Carrito
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrito */}
      <div className="mb-6 p-4 bg-gray-100 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Carrito</h2>
        {cart.length === 0 ? (
          <p>El carrito está vacío</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2">Producto</th>
                    <th className="border p-2">Cantidad</th>
                    <th className="border p-2">Precio Unitario</th>
                    <th className="border p-2">Total</th>
                    <th className="border p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId}>
                      <td className="border p-2">{item.name}</td>
                      <td className="border p-2">{item.quantity}</td>
                      <td className="border p-2">${item.price.toFixed(2)}</td>
                      <td className="border p-2">${(item.price * item.quantity).toFixed(2)}</td>
                      <td className="border p-2">
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="bg-red-500 hover:bg-red-600 text-white p-1 rounded transition-colors"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Total: ${total.toFixed(2)}</h3>
              <div className="mt-2">
                <label className="block">Método de Pago:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "cash" | "mercado_pago")}
                  className="border p-2 rounded w-full md:w-auto mt-1"
                >
                  <option value="cash">Efectivo</option>
                  <option value="mercado_pago">Mercado Pago</option>
                </select>
              </div>
              <button
                onClick={handleSale}
                disabled={processingPayment}
                className={`${
                  processingPayment ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
                } text-white p-2 rounded mt-4 transition-colors flex items-center justify-center`}
              >
                {processingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  "Confirmar Venta"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}