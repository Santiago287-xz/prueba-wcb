"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, PlusCircle, Edit, Trash, RefreshCw, DatabaseIcon, BarChart4 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  stocks: { id: string; location: string; quantity: number }[];
}

interface Category {
  id: string;
  name: string;
}

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface SaleSummary {
  totalSales: number;
  cashSales: number;
  digitalSales: number;
  topProducts: { name: string; total: number }[];
}

export default function InventoryDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mercado_pago">("cash");
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"sales" | "inventory" | "reports">("sales");
  const [salesSummary, setSalesSummary] = useState<SaleSummary | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });
  
  // Product management state
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productFormData, setProductFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    image: null as File | null,
    mainWarehouseStock: "0", 
    post1Stock: "0",
    post2Stock: "0"
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formProcessing, setFormProcessing] = useState(false);

  // Stock transfer state
  const [showStockTransferForm, setShowStockTransferForm] = useState(false);
  const [stockTransferData, setStockTransferData] = useState({
    productId: "",
    post1Quantity: "0",
    post2Quantity: "0"
  });
  const [transferringStock, setTransferringStock] = useState(false);

  const isAdmin = session?.user?.role === "admin";
  const isCourtManager = session?.user?.role === "court_manager";
  const canManageInventory = isAdmin || isCourtManager;

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    
    const allowedRoles = ["employee", "admin", "court_manager"];
    if (!allowedRoles.includes(session?.user?.role || "")) {
      setError("No tienes permisos para acceder a esta página");
      setLoading(false);
      return;
    }
    
    fetchProducts();
    if (canManageInventory) {
      fetchCategories();
    }
    
    // Fetch sales summary data if on reports tab
    if (activeTab === "reports") {
      fetchSalesSummary();
    }
  }, [session, status, router, canManageInventory, activeTab, dateRange]);

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

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        console.error("Error al obtener categorías:", res.status);
      }
    } catch (error) {
      console.error("Error al obtener categorías:", error);
    }
  };

  const fetchSalesSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/sales/summary?start=${dateRange.start}&end=${dateRange.end}`);
      
      if (!res.ok) {
        throw new Error(`Error: ${res.status} - ${res.statusText}`);
      }
      
      const data = await res.json();
      setSalesSummary(data);
    } catch (error) {
      console.error("Error al obtener resumen de ventas:", error);
      setError("Error al cargar el resumen de ventas");
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
      // Primero, procesar la venta normal
      const saleRes = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, paymentMethod }),
      });

      if (!saleRes.ok) {
        const saleData = await saleRes.json();
        throw new Error(`Error: ${saleData.error || "No se pudo procesar la venta"}`);
      }

      const saleData = await saleRes.json();
      
      // Luego, registrar la transacción global
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "income",
          category: "beverage_sales",
          amount: total,
          description: `Venta de bebidas (${cart.length} items)`,
          paymentMethod,
          location: session?.user?.post,
          userId: session?.user?.id,
          saleId: Array.isArray(saleData) ? saleData[0]?.id : saleData?.id
        }),
      });

      setCart([]);
      fetchProducts();
      alert("Venta registrada con éxito");
    } catch (error) {
      console.error("Error al registrar la venta:", error);
      setError("Error de conexión. Por favor, intenta nuevamente.");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Product form handlers
  const resetProductForm = () => {
    setProductFormData({
      name: "",
      description: "",
      price: "",
      categoryId: "",
      image: null,
      mainWarehouseStock: "0",
      post1Stock: "0",
      post2Stock: "0"
    });
    setImagePreview(null);
    setEditingProductId(null);
    setShowProductForm(false);
  };

  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProductFormData(prev => ({ ...prev, image: file }));
      
      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startEditingProduct = (product: Product) => {
    setEditingProductId(product.id);
    
    // Find stock quantities for each location
    const mainWarehouseStock = product.stocks.find(s => s.location === 'main_warehouse')?.quantity.toString() || '0';
    const post1Stock = product.stocks.find(s => s.location === 'post_1')?.quantity.toString() || '0';
    const post2Stock = product.stocks.find(s => s.location === 'post_2')?.quantity.toString() || '0';
    
    setProductFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      categoryId: product.categoryId,
      image: null,
      mainWarehouseStock,
      post1Stock,
      post2Stock
    });
    setImagePreview(product.image || null);
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory) return;

    try {
      setFormProcessing(true);
      setError(null);
      
      const data = new FormData();
      
      if (editingProductId) {
        data.append("id", editingProductId);
      }
      
      data.append("name", productFormData.name);
      data.append("description", productFormData.description);
      data.append("price", productFormData.price);
      data.append("categoryId", productFormData.categoryId);
      data.append("mainWarehouseStock", productFormData.mainWarehouseStock);
      data.append("post1Stock", productFormData.post1Stock);
      data.append("post2Stock", productFormData.post2Stock);
      
      if (productFormData.image) {
        data.append("image", productFormData.image);
      }

      const res = await fetch("/api/inventory/products", {
        method: editingProductId ? "PUT" : "POST",
        body: data,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Error al ${editingProductId ? "actualizar" : "crear"} producto`);
      }

      fetchProducts();
      resetProductForm();
    } catch (err) {
      console.error(`Error ${editingProductId ? "updating" : "creating"} product:`, err);
      setError(err instanceof Error ? err.message : `Error al ${editingProductId ? "actualizar" : "crear"} producto`);
    } finally {
      setFormProcessing(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!canManageInventory) return;
    
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      return;
    }

    try {
      setError(null);
      
      const res = await fetch("/api/inventory/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al eliminar producto");
      }

      fetchProducts();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError(err instanceof Error ? err.message : "Error al eliminar producto");
    }
  };

  // Stock transfer handlers
  const openStockTransferForm = (product: Product) => {
    setStockTransferData({
      productId: product.id,
      post1Quantity: "0",
      post2Quantity: "0"
    });
    setShowStockTransferForm(true);
  };

  const handleStockTransferChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStockTransferData(prev => ({ ...prev, [name]: value }));
  };

  const handleStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory) return;

    try {
      setTransferringStock(true);
      setError(null);

      const post1Quantity = parseInt(stockTransferData.post1Quantity) || 0;
      const post2Quantity = parseInt(stockTransferData.post2Quantity) || 0;

      if (post1Quantity < 0 || post2Quantity < 0) {
        setError("Las cantidades deben ser números positivos");
        setTransferringStock(false);
        return;
      }

      const product = products.find(p => p.id === stockTransferData.productId);
      if (!product) {
        setError("Producto no encontrado");
        setTransferringStock(false);
        return;
      }

      const mainWarehouseStock = product.stocks.find(s => s.location === 'main_warehouse')?.quantity || 0;
      if (mainWarehouseStock < post1Quantity + post2Quantity) {
        setError("Stock insuficiente en el almacén principal");
        setTransferringStock(false);
        return;
      }

      const res = await fetch("/api/inventory/stock-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: stockTransferData.productId,
          post1Quantity,
          post2Quantity
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al transferir stock");
      }

      fetchProducts();
      setShowStockTransferForm(false);
    } catch (err) {
      console.error("Error transferring stock:", err);
      setError(err instanceof Error ? err.message : "Error al transferir stock");
    } finally {
      setTransferringStock(false);
    }
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Loading state
  if (status === "loading" || (loading && !error && activeTab !== "reports")) {
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
  
  const allowedRoles = ["employee", "admin", "court_manager"];
  if (!allowedRoles.includes(session.user.role || "")) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">No autorizado</h1>
        <p>No tienes permisos para acceder a esta página.</p>
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
  
  if (session.user.role === "employee" && !session.user.post) {
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Sistema de Bebidas
          {session.user.post && ` - ${session.user.post}`}
        </h1>
        <div className="flex space-x-2">
          {canManageInventory && activeTab === "inventory" && (
            <button 
              onClick={() => setShowProductForm(!showProductForm)}
              className="flex items-center bg-green-600 text-white px-4 py-2 rounded"
            >
              {showProductForm ? (
                <>
                  <span className="mr-2">✕</span>
                  Cancelar
                </>
              ) : (
                <>
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Nuevo Producto
                </>
              )}
            </button>
          )}
          <button 
            onClick={fetchProducts}
            className="flex items-center bg-blue-500 text-white px-4 py-2 rounded"
            title="Actualizar datos"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "sales"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("sales")}
        >
          Ventas
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "inventory"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("inventory")}
        >
          Inventario
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "reports"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("reports")}
        >
          Reportes
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Sales Tab Content */}
      {activeTab === "sales" && (
        <div>
          {/* Lista de productos para ventas */}
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
                      {product.image && (
                        <div className="relative w-full h-32 mb-3">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover rounded"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        </div>
                      )}
                      
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <p>Precio: ${product.price.toFixed(2)}</p>
                      <p>Stock: {stock?.quantity || 0}</p>
                      
                      <button
                        onClick={() => addToCart(product)}
                        className="bg-green-500 hover:bg-green-600 text-white p-2 rounded mt-2 transition-colors w-full"
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
      )}

      {/* Inventory Tab Content */}
      {activeTab === "inventory" && (
        <div>
          {/* Product Management Form (for admins/managers) */}
          {canManageInventory && showProductForm && (
            <div className="bg-gray-50 border rounded p-4 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingProductId ? "Editar Producto" : "Nuevo Producto"}
              </h2>
              <form onSubmit={handleSaveProduct} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nombre</label>
                    <input
                      type="text"
                      name="name"
                      value={productFormData.name}
                      onChange={handleProductInputChange}
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio</label>
                    <input
                      type="number"
                      name="price"
                      value={productFormData.price}
                      onChange={handleProductInputChange}
                      step="0.01"
                      min="0"
                      className="w-full border rounded p-2"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Categoría</label>
                    <select
                      name="categoryId"
                      value={productFormData.categoryId}
                      onChange={handleProductInputChange}
                      className="w-full border rounded p-2"
                      required
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Imagen</label>
                    <input
                      type="file"
                      name="image"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="w-full border rounded p-2"
                    />
                    {imagePreview && (
                      <div className="mt-2 relative h-32 w-32">
                        <Image
                          src={imagePreview}
                          alt="Vista previa"
                          fill
                          className="object-cover rounded"
                          sizes="128px"
                        />
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">Descripción</label>
                    <textarea
                      name="description"
                      value={productFormData.description}
                      onChange={handleProductInputChange}
                      className="w-full border rounded p-2"
                      rows={3}
                    />
                  </div>
                  
                  {/* Stock Fields */}
                  <div className="md:col-span-2 mt-2">
                    <h3 className="text-md font-medium mb-2">Stock Inicial por Ubicación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Almacén Principal</label>
                        <input
                          type="number"
                          name="mainWarehouseStock"
                          value={productFormData.mainWarehouseStock}
                          onChange={handleProductInputChange}
                          min="0"
                          className="w-full border rounded p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Puesto 1</label>
                        <input
                          type="number"
                          name="post1Stock"
                          value={productFormData.post1Stock}
                          onChange={handleProductInputChange}
                          min="0"
                          className="w-full border rounded p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Puesto 2</label>
                        <input
                          type="number"
                          name="post2Stock"
                          value={productFormData.post2Stock}
                          onChange={handleProductInputChange}
                          min="0"
                          className="w-full border rounded p-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetProductForm}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={formProcessing}
                    className="px-4 py-2 bg-primary text-white rounded flex items-center"
                  >
                    {formProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">💾</span>
                        {editingProductId ? "Actualizar" : "Guardar"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Stock Transfer Form */}
          {canManageInventory && showStockTransferForm && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
              <h2 className="text-xl font-semibold mb-4">Transferir Stock a Puestos</h2>
              <form onSubmit={handleStockTransfer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Cantidad para Puesto 1</label>
                    <input
                      type="number"
                      name="post1Quantity"
                      value={stockTransferData.post1Quantity}
                      onChange={handleStockTransferChange}
                      min="0"
                      className="w-full border rounded p-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cantidad para Puesto 2</label>
                    <input
                      type="number"
                      name="post2Quantity"
                      value={stockTransferData.post2Quantity}
                      onChange={handleStockTransferChange}
                      min="0"
                      className="w-full border rounded p-2"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStockTransferForm(false)}
                    className="px-4 py-2 border rounded hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={transferringStock}
                    className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
                  >
                    {transferringStock ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      "Transferir Stock"
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de productos para inventario */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Inventario de Productos</h2>
            {products.length === 0 ? (
              <p>No hay productos disponibles.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Producto</th>
                      <th className="border p-2 text-center">Precio</th>
                      <th className="border p-2 text-center">Categoría</th>
                      <th className="border p-2 text-center">Almacén</th>
                      <th className="border p-2 text-center">Puesto 1</th>
                      <th className="border p-2 text-center">Puesto 2</th>
                      <th className="border p-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const mainWarehouseStock = product.stocks.find(s => s.location === 'main_warehouse')?.quantity || 0;
                      const post1Stock = product.stocks.find(s => s.location === 'post_1')?.quantity || 0;
                      const post2Stock = product.stocks.find(s => s.location === 'post_2')?.quantity || 0;
                      
                      return (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="border p-2">
                            <div className="flex items-center">
                              {product.image && (
                                <div className="relative w-12 h-12 mr-2">
                                  <Image
                                    src={product.image}
                                    alt={product.name}
                                    fill
                                    className="object-cover rounded"
                                    sizes="48px"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.description?.substring(0, 50)}{product.description?.length > 50 ? "..." : ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="border p-2 text-center">${product.price.toFixed(2)}</td>
                          <td className="border p-2 text-center">{product.category?.name || "-"}</td>
                          <td className="border p-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-sm ${mainWarehouseStock > 10 ? 'bg-green-100 text-green-800' : mainWarehouseStock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {mainWarehouseStock}
                            </span>
                          </td>
                          <td className="border p-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-sm ${post1Stock > 5 ? 'bg-green-100 text-green-800' : post1Stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {post1Stock}
                            </span>
                          </td>
                          <td className="border p-2 text-center">
                            <span className={`px-2 py-1 rounded-full text-sm ${post2Stock > 5 ? 'bg-green-100 text-green-800' : post2Stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {post2Stock}
                            </span>
                          </td>
                          <td className="border p-2 text-center">
                            <div className="flex justify-center space-x-1">
                              {canManageInventory && (
                                <>
                                  <button
                                    onClick={() => startEditingProduct(product)}
                                    className="bg-blue-100 p-1 rounded text-blue-600 hover:bg-blue-200"
                                    title="Editar producto"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="bg-red-100 p-1 rounded text-red-600 hover:bg-red-200"
                                    title="Eliminar producto"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => openStockTransferForm(product)}
                                    className="bg-green-100 p-1 rounded text-green-600 hover:bg-green-200"
                                    title="Transferir stock"
                                  >
                                    <DatabaseIcon className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab Content */}
      {activeTab === "reports" && (
        <div>
          <div className="mb-6 p-4 bg-gray-50 rounded border">
            <h2 className="text-xl font-semibold mb-4">Reportes de Ventas</h2>
            
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  name="start"
                  value={dateRange.start}
                  onChange={handleDateRangeChange}
                  className="border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fecha Fin</label>
                <input
                  type="date"
                  name="end"
                  value={dateRange.end}
                  onChange={handleDateRangeChange}
                  className="border rounded p-2"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchSalesSummary}
                  className="bg-primary text-white px-4 py-2 rounded"
                >
                  Generar Reporte
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center my-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : salesSummary ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded shadow">
                    <h3 className="font-semibold text-lg text-center">Total Ventas</h3>
                    <p className="text-2xl font-bold text-center">${salesSummary.totalSales.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-4 rounded shadow">
                    <h3 className="font-semibold text-lg text-center">Efectivo</h3>
                    <p className="text-2xl font-bold text-center">${salesSummary.cashSales.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-4 rounded shadow">
                    <h3 className="font-semibold text-lg text-center">Mercado Pago</h3>
                    <p className="text-2xl font-bold text-center">${salesSummary.digitalSales.toFixed(2)}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded shadow mb-6">
                  <h3 className="font-semibold text-lg mb-4">Productos Más Vendidos</h3>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Producto</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesSummary.topProducts.map((product, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2">{product.name}</td>
                          <td className="text-right p-2">${product.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p>Selecciona un rango de fechas y genera el reporte</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}