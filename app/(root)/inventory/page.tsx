"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  stocks: { id: string; location: string; quantity: number; minStock: number }[];
}

export default function InventoryPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState({ name: "", description: "", price: 0, image: null as File | null });
  const [categoryId] = useState("replace_with_bebidas_category_id"); // Reemplaza con el ID real de la categoría "Bebidas"
  const [stockUpdates, setStockUpdates] = useState<{ stockId: string; quantity: number; type: string }[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch("/api/inventory/products");
    const data = await res.json();
    setProducts(data);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || session.user.role !== "admin") {
      alert("No autorizado");
      return;
    }

    const formData = new FormData();
    formData.append("name", newProduct.name);
    formData.append("description", newProduct.description);
    formData.append("price", newProduct.price.toString());
    formData.append("categoryId", categoryId);
    if (newProduct.image) {
      formData.append("image", newProduct.image);
    }

    const res = await fetch("/api/inventory/products", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      fetchProducts();
      setNewProduct({ name: "", description: "", price: 0, image: null });
    } else {
      alert("Error al agregar el producto");
    }
  };

  const handleUpdateStock = async (stockId: string, quantity: number, type: string) => {
    const res = await fetch("/api/inventory/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockId, quantity, type }),
    });

    if (res.ok) {
      fetchProducts();
    } else {
      alert("Error al actualizar el stock");
    }
  };

  const lowStockProducts = products
    .flatMap((product) =>
      product.stocks
        .filter((stock) => stock.quantity <= stock.minStock)
        .map((stock) => ({
          productName: product.name,
          location: stock.location,
          quantity: stock.quantity,
        }))
    );

  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "employee")) {
    return <div>No autorizado</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gestión de Inventario</h1>

      {/* Panel de alertas de stock bajo */}
      {lowStockProducts.length > 0 && (
        <div className="mb-6 p-4 bg-red-100 rounded">
          <h2 className="text-xl font-semibold text-red-700">Alertas de Stock Bajo</h2>
          <ul className="mt-2">
            {lowStockProducts.map((item, index) => (
              <li key={index} className="text-sm">
                Quedan {item.quantity} unidades de {item.productName} en {item.location}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Formulario para agregar producto (solo admin) */}
      {session.user.role === "admin" && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-4">Agregar Producto</h2>
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1">Nombre:</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="border p-2 rounded w-full"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Descripción:</label>
              <input
                type="text"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="border p-2 rounded w-full"
              />
            </div>
            <div>
              <label className="block mb-1">Precio:</label>
              <input
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                className="border p-2 rounded w-full"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Imagen:</label>
              <input
                type="file"
                onChange={(e) => setNewProduct({ ...newProduct, image: e.target.files?.[0] || null })}
                className="border p-2 rounded w-full"
              />
            </div>
            <div className="col-span-3">
              <button type="submit" className="bg-green-500 text-white p-2 rounded">
                Agregar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de productos */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Producto</th>
            <th className="border p-2">Descripción</th>
            <th className="border p-2">Precio</th>
            <th className="border p-2">Stock (Almacén Principal)</th>
            <th className="border p-2">Stock (Puesto 1)</th>
            <th className="border p-2">Stock (Puesto 2)</th>
            {session.user.role === "admin" && <th className="border p-2">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td className="border p-2">{product.name}</td>
              <td className="border p-2">{product.description}</td>
              <td className="border p-2">${product.price}</td>
              {["main_warehouse", "post_1", "post_2"].map((location) => {
                const stock = product.stocks.find((s) => s.location === location);
                return (
                  <td key={location} className="border p-2">
                    {stock?.quantity || 0}
                    {(session.user.role === "admin" || session.user.post === location) && (
                      <div className="mt-2">
                        <input
                          type="number"
                          placeholder="Cantidad"
                          onChange={(e) => {
                            const quantity = parseInt(e.target.value);
                            if (quantity) {
                              setStockUpdates((prev) => [
                                ...prev.filter((u) => u.stockId !== stock?.id),
                                { stockId: stock?.id || "", quantity, type: "entry" },
                              ]);
                            }
                          }}
                          className="border p-1 rounded w-20"
                        />
                        <button
                          onClick={() => {
                            const update = stockUpdates.find((u) => u.stockId === stock?.id);
                            if (update) {
                              handleUpdateStock(stock?.id || "", update.quantity, "entry");
                            }
                          }}
                          className="bg-green-500 text-white p-1 rounded ml-2"
                        >
                          +
                        </button>
                        <button
                          onClick={() => {
                            const update = stockUpdates.find((u) => u.stockId === stock?.id);
                            if (update) {
                              handleUpdateStock(stock?.id || "", update.quantity, "exit");
                            }
                          }}
                          className="bg-red-500 text-white p-1 rounded ml-2"
                        >
                          -
                        </button>
                      </div>
                    )}
                  </td>
                );
              })}
              {session.user.role === "admin" && (
                <td className="border p-2">
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/inventory/products", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: product.id }),
                      });
                      if (res.ok) fetchProducts();
                    }}
                    className="bg-red-500 text-white p-1 rounded"
                  >
                    Eliminar
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}