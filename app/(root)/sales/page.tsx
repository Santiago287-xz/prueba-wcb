"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mercado_pago">("cash");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch("/api/inventory/products");
    const data = await res.json();
    setProducts(data);
  };

  const addToCart = (product: Product) => {
    const stock = product.stocks.find((s) => s.location === session?.user?.post);
    if (!stock || stock.quantity <= 0) {
      alert("No hay stock disponible");
      return;
    }

    setCart((prev) => {
      const existingItem = prev.find((item) => item.productId === product.id);
      if (existingItem) {
        if (existingItem.quantity + 1 > stock.quantity) {
          alert("No hay suficiente stock");
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId: product.id, name: product.name, quantity: 1, price: product.price }];
    });
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
      alert("El carrito está vacío");
      return;
    }

    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, paymentMethod }),
    });

    if (res.ok) {
      setCart([]);
      fetchProducts();
      alert("Venta registrada con éxito");
    } else {
      alert("Error al registrar la venta");
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!session?.user || session.user.role !== "employee") {
    return <div>No autorizado</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Ventas - {session.user.post}</h1>

      {/* Lista de productos */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Productos Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((product) => {
            const stock = product.stocks.find((s) => s.location === session.user.post);
            return (
              <div key={product.id} className="border p-4 rounded">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <p>Precio: ${product.price}</p>
                <p>Stock: {stock?.quantity || 0}</p>
                <button
                  onClick={() => addToCart(product)}
                  className="bg-green-500 text-white p-2 rounded mt-2"
                >
                  Agregar al Carrito
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carrito */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-4">Carrito</h2>
        {cart.length === 0 ? (
          <p>El carrito está vacío</p>
        ) : (
          <>
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
                    <td className="border p-2">${item.price}</td>
                    <td className="border p-2">${item.price * item.quantity}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="bg-red-500 text-white p-1 rounded"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Total: ${total}</h3>
              <label className="block mt-2">Método de Pago:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as "cash" | "mercado_pago")}
                className="border p-2 rounded"
              >
                <option value="cash">Efectivo</option>
                <option value="mercado_pago">Mercado Pago</option>
              </select>
              <button
                onClick={handleSale}
                className="bg-green-500 text-white p-2 rounded mt-4"
              >
                Confirmar Venta
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}