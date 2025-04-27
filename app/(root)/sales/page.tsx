"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Loader2, ShoppingCart, Package, BarChart3, Plus, Minus, RefreshCw, 
  Edit, Trash2, ArrowRightLeft, PlusCircle 
} from "lucide-react";
import { useRouter } from "next/navigation";
import Modal from "@/app/components/modal";

// Product type definitions
interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
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

type ModalType = "none" | "edit" | "transfer" | "add";

export default function SimplifiedInventoryDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Main state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mercado_pago">("cash");
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Set default tab - for admins, default to inventory
  const [activeTab, setActiveTab] = useState<"sales" | "inventory" | "reports">(
    session?.user?.role === "admin" ? "inventory" : "sales"
  )
  
  const [salesSummary, setSalesSummary] = useState<SaleSummary | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });
  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>("none");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Product form state
  const [productFormData, setProductFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    mainWarehouseStock: "0",
    post1Stock: "0",
    post2Stock: "0"
  });

  // Stock transfer state
  const [stockTransferData, setStockTransferData] = useState({
    productId: "",
    post1Quantity: "0",
    post2Quantity: "0"
  });

  // Stock addition state
  const [stockAddData, setStockAddData] = useState({
    productId: "",
    quantity: "0"
  });

  // User role checks
  const isAdmin = session?.user?.role === "admin";
  const isInventoryManager = session?.user?.role === "court_manager" || session?.user?.role === "receptionist";
  const canManageInventory = isAdmin || isInventoryManager;
  const canViewSales = !isAdmin; // Admins cannot view sales
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Initial data loading
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    // Redirect admins if they're on the sales tab
    if (isAdmin && activeTab === "sales") {
      setActiveTab("inventory");
      return;
    }

    fetchProducts();
    if (canManageInventory) {
      fetchCategories();
    }

    if (activeTab === "reports") {
      fetchSalesSummary();
    }
  }, [status, router, canManageInventory, activeTab, isAdmin]);

  // Data fetching functions
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sales/inventory/products");
      if (!res.ok) {
        throw new Error(`Error: ${res.status} - ${res.statusText}`);
      }
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      console.error("Error al obtener productos:", error);
      setError("Error al cargar los productos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/sales/inventory/categories");
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

  // Cart management functions
  const addToCart = (product: Product) => {
    console.log("User post:", session?.user?.post);  // Nuevo log para ver el "post" del usuario
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

  const decreaseQuantity = (productId: string) => {
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

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Sales processing
  const handleSale = async () => {
    if (cart.length === 0) {
      setError("El carrito está vacío");
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // Process the sale
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

      // Register the global transaction
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
      setShowCart(false);
      alert("Venta registrada con éxito");
    } catch (error) {
      console.error("Error al registrar la venta:", error);
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setProcessingPayment(false);
    }
  };

  // Modal handlers
  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    
    // Find stock quantities for each location
    const mainWarehouseStock = product.stocks.find(s => s.location === 'main_warehouse')?.quantity.toString() || '0';
    const post1Stock = product.stocks.find(s => s.location === 'post_1')?.quantity.toString() || '0';
    const post2Stock = product.stocks.find(s => s.location === 'post_2')?.quantity.toString() || '0';

    setProductFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      categoryId: product.categoryId,
      mainWarehouseStock,
      post1Stock,
      post2Stock
    });
    
    setActiveModal("edit");
  };

  const openTransferModal = (product: Product) => {
    setSelectedProduct(product);
    setStockTransferData({
      productId: product.id,
      post1Quantity: "0",
      post2Quantity: "0"
    });
    setActiveModal("transfer");
  };

  const openAddStockModal = (product: Product) => {
    setSelectedProduct(product);
    setStockAddData({
      productId: product.id,
      quantity: "0"
    });
    setActiveModal("add");
  };

  const closeModal = () => {
    setActiveModal("none");
    setSelectedProduct(null);
  };

  // Product form handlers
  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory || !selectedProduct) return;

    try {
      setIsProcessing(true);
      setError(null);

      const data = new FormData();
      data.append("id", selectedProduct.id);
      data.append("name", productFormData.name);
      data.append("description", productFormData.description);
      data.append("price", productFormData.price);
      data.append("categoryId", productFormData.categoryId);
      data.append("mainWarehouseStock", productFormData.mainWarehouseStock);
      data.append("post1Stock", productFormData.post1Stock);
      data.append("post2Stock", productFormData.post2Stock);

      const res = await fetch("/api/sales/inventory/products", {
        method: "PUT",
        body: data,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar producto");
      }

      await fetchProducts();
      closeModal();
    } catch (err) {
      console.error("Error updating product:", err);
      setError(err instanceof Error ? err.message : "Error al actualizar producto");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!canManageInventory || !selectedProduct) return;

    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const res = await fetch("/api/sales/inventory/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProduct.id }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al eliminar producto");
      }

      await fetchProducts();
      closeModal();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError(err instanceof Error ? err.message : "Error al eliminar producto");
    } finally {
      setIsProcessing(false);
    }
  };

  // Stock transfer handlers
  const handleStockTransferChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStockTransferData(prev => ({ ...prev, [name]: value }));
  };

  const handleStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory || !selectedProduct) return;

    try {
      setIsProcessing(true);
      setError(null);

      const post1Quantity = parseInt(stockTransferData.post1Quantity) || 0;
      const post2Quantity = parseInt(stockTransferData.post2Quantity) || 0;

      if (post1Quantity < 0 || post2Quantity < 0) {
        setError("Las cantidades deben ser números positivos");
        setIsProcessing(false);
        return;
      }

      if (post1Quantity + post2Quantity <= 0) {
        setError("Debe transferir al menos un producto");
        setIsProcessing(false);
        return;
      }

      const mainWarehouseStock = selectedProduct.stocks.find(s => s.location === 'main_warehouse')?.quantity || 0;
      if (mainWarehouseStock < post1Quantity + post2Quantity) {
        setError(`Stock insuficiente en el almacén principal. Disponible: ${mainWarehouseStock}`);
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/sales/inventory/stock-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          post1Quantity,
          post2Quantity
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al transferir stock");
      }

      await fetchProducts();
      closeModal();
    } catch (err) {
      console.error("Error transferring stock:", err);
      setError(err instanceof Error ? err.message : "Error al transferir stock");
    } finally {
      setIsProcessing(false);
    }
  };

  // Stock addition handlers
  const handleStockAddChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStockAddData(prev => ({ ...prev, [name]: value }));
  };

  const handleStockAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory || !selectedProduct) return;

    try {
      setIsProcessing(true);
      setError(null);

      const quantity = parseInt(stockAddData.quantity) || 0;

      if (quantity <= 0) {
        setError("La cantidad debe ser un número positivo");
        setIsProcessing(false);
        return;
      }

      const res = await fetch("/api/sales/inventory/stock-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al agregar stock");
      }

      await fetchProducts();
      closeModal();
    } catch (err) {
      console.error("Error adding stock:", err);
      setError(err instanceof Error ? err.message : "Error al agregar stock");
    } finally {
      setIsProcessing(false);
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
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  const filteredProducts = selectedCategory
    ? products.filter(product => product.categoryId === selectedCategory)
    : products;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">
            Sistema de Bebidas {session?.user.post && <span className="text-blue-500 ml-1">| {session.user.post.replace('post_', 'Puesto ')}</span>}
          </h1>

          {/* Mobile cart button - only for non-admin users */}
          <div className="md:hidden flex items-center gap-2">
            {canViewSales && cart.length > 0 && (
              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 bg-blue-500 text-white rounded-full"
              >
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cart.length}
                </span>
              </button>
            )}
            <button
              onClick={() => fetchProducts()}
              className="p-2 text-gray-600 bg-gray-100 rounded-full"
              aria-label="Refrescar"
            >
              <RefreshCw size={20} />
            </button>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            {canViewSales && cart.length > 0 && (
              <button
                onClick={() => setShowCart(true)}
                className="relative flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <ShoppingCart size={18} />
                <span>Ver carrito ({cart.length})</span>
              </button>
            )}
            <button
              onClick={() => fetchProducts()}
              className="p-2 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Refrescar"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto">
            {/* Only show sales tab for non-admin users */}
            {canViewSales && (
              <button
                className={`py-3 px-4 font-medium text-sm transition-colors ${activeTab === "sales"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                  }`}
                onClick={() => setActiveTab("sales")}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} />
                  <span>Ventas</span>
                </div>
              </button>
            )}
            <button
              className={`py-3 px-4 font-medium text-sm transition-colors ${activeTab === "inventory"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                }`}
              onClick={() => setActiveTab("inventory")}
            >
              <div className="flex items-center gap-2">
                <Package size={18} />
                <span>Inventario</span>
              </div>
            </button>
            <button
              className={`py-3 px-4 font-medium text-sm transition-colors ${activeTab === "reports"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                }`}
              onClick={() => setActiveTab("reports")}
            >
              <div className="flex items-center gap-2">
                <BarChart3 size={18} />
                <span>Reportes</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Sales Tab - only visible to non-admin users */}
        {activeTab === "sales" && canViewSales && (
          <div>
            {categories.length > 0 && (
              <div className="mb-6 overflow-x-auto">
                <div className="flex space-x-2 pb-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === null
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    Todos
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === category.id
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Products grid */}
            <div className="mb-6">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                  <p className="text-gray-500">No hay productos disponibles.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredProducts.map((product) => {
                    const stock = product.stocks.find((s) => s.location === session?.user.post);
                    const isInCart = cart.some(item => item.productId === product.id);
                    return (
                      <div
                        key={product.id}
                        className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all ${isInCart ? 'border-2 border-blue-500' : 'border border-gray-200'
                          }`}
                      >
                        <div className="h-36 bg-gray-100 flex items-center justify-center">
                          <Package size={36} className="text-gray-400" />
                        </div>
                        <div className="p-3">
                          <h3 className="font-semibold text-sm text-gray-800 truncate">{product.name}</h3>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-blue-600 font-bold">${product.price.toFixed(2)}</span>
                            <span className={`text-xs rounded-full px-2 py-1 ${stock && stock.quantity > 5
                                ? 'bg-green-100 text-green-800'
                                : stock && stock.quantity > 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                              Stock: {stock?.quantity || 0}
                            </span>
                          </div>
                          <button
                            onClick={() => addToCart(product)}
                            className={`mt-2 w-full py-2 px-3 rounded text-sm font-medium ${!stock || stock.quantity <= 0
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : isInCart
                                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            disabled={!stock || stock.quantity <= 0}
                          >
                            {isInCart ? 'Agregar más' : 'Agregar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Tab Content */}
        {activeTab === "inventory" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <h2 className="sr-only">Inventario de Productos</h2>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No hay productos disponibles.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 border-b">Producto</th>
                      <th className="px-4 py-3 border-b text-center">Precio</th>
                      <th className="px-4 py-3 border-b text-center">Almacén</th>
                      <th className="px-4 py-3 border-b text-center">Puesto 1</th>
                      <th className="px-4 py-3 border-b text-center">Puesto 2</th>
                      {canManageInventory && <th className="px-4 py-3 border-b text-center">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map((product) => {
                      const mainWarehouseStock = product.stocks.find(s => s.location === 'main_warehouse')?.quantity || 0;
                      const post1Stock = product.stocks.find(s => s.location === 'post_1')?.quantity || 0;
                      const post2Stock = product.stocks.find(s => s.location === 'post_2')?.quantity || 0;

                      return (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.category?.name || "-"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                            <span className="font-medium">${product.price.toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${mainWarehouseStock > 10
                                ? 'bg-green-100 text-green-800'
                                : mainWarehouseStock > 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                              {mainWarehouseStock}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${post1Stock > 5
                                ? 'bg-green-100 text-green-800'
                                : post1Stock > 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                              {post1Stock}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${post2Stock > 5
                                ? 'bg-green-100 text-green-800'
                                : post2Stock > 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                              {post2Stock}
                            </span>
                          </td>
                          {canManageInventory && (
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <div className="flex justify-center gap-3">
                                <button
                                  onClick={() => openEditModal(product)}
                                  className="p-2 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-full transition-colors"
                                  title="Editar producto"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => openAddStockModal(product)}
                                  className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-full transition-colors"
                                  title="Agregar stock"
                                >
                                  <PlusCircle size={18} />
                                </button>
                                <button
                                  onClick={() => openTransferModal(product)}
                                  className="p-2 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-full transition-colors"
                                  title="Transferir stock"
                                >
                                  <ArrowRightLeft size={18} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab Content */}
        {activeTab === "reports" && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Reportes de Ventas</h2>

            <div className="flex flex-wrap gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  name="start"
                  value={dateRange.start}
                  onChange={handleDateRangeChange}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                <input
                  type="date"
                  name="end"
                  value={dateRange.end}
                  onChange={handleDateRangeChange}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchSalesSummary}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors font-medium text-sm"
                >
                  Generar Reporte
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center my-12">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              </div>
            ) : salesSummary ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="font-medium text-sm text-blue-700 mb-1">Total Ventas</h3>
                    <p className="text-2xl font-bold text-gray-900">${salesSummary.totalSales.toFixed(2)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h3 className="font-medium text-sm text-green-700 mb-1">Efectivo</h3>
                    <p className="text-2xl font-bold text-gray-900">${salesSummary.cashSales.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h3 className="font-medium text-sm text-purple-700 mb-1">Mercado Pago</h3>
                    <p className="text-2xl font-bold text-gray-900">${salesSummary.digitalSales.toFixed(2)}</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <h3 className="px-4 py-3 bg-gray-50 font-medium text-sm text-gray-700 border-b">Productos Más Vendidos</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Producto
                        </th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {salesSummary.topProducts.map((product, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">${product.total.toFixed(2)}</td>
                        </tr>
                      ))}
                      {salesSummary.topProducts.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-8 text-center text-sm text-gray-500">
                            No hay datos de ventas en este período
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">Selecciona un rango de fechas y genera el reporte</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Shopping Cart Modal - only for non-admin users */}
      {showCart && canViewSales && (
        <Modal
          isOpen={showCart}
          onClose={() => setShowCart(false)}
          title="Carrito de Compras"
          isProcessing={processingPayment}
          footer={
            <>
              {cart.length > 0 && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-medium">Total:</span>
                    <span className="text-xl font-bold text-blue-600">${total.toFixed(2)}</span>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "cash" | "mercado_pago")}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="cash">Efectivo</option>
                      <option value="mercado_pago">Mercado Pago</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSale}
                    disabled={processingPayment}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors"
                  >
                    Confirmar Venta
                  </button>
                </>
              )}
            </>
          }
        >
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">El carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center justify-between border-b pb-3">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-gray-500">${item.price.toFixed(2)} x {item.quantity}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => decreaseQuantity(item.productId)}
                      className="p-1 rounded-full bg-gray-200 text-gray-700"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => addToCart(products.find(p => p.id === item.productId)!)}
                      className="p-1 rounded-full bg-blue-500 text-white"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Edit Product Modal */}
      <Modal
        isOpen={activeModal === "edit"}
        onClose={closeModal}
        title={`Editar Producto: ${selectedProduct?.name || ""}`}
        isProcessing={isProcessing}
        footer={
          <div className="flex justify-between">
            <button
              onClick={handleDeleteProduct}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium text-sm flex items-center"
            >
              <Trash2 size={16} className="mr-1" />
              Eliminar
            </button>
            <div className="flex gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProduct}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium text-sm"
              >
                Guardar
              </button>
            </div>
          </div>
        }
      >
        {selectedProduct && (
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={productFormData.name}
                  onChange={handleProductInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
                <input
                  type="number"
                  name="price"
                  value={productFormData.price}
                  onChange={handleProductInputChange}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                name="categoryId"
                value={productFormData.categoryId}
                onChange={handleProductInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                name="description"
                value={productFormData.description}
                onChange={handleProductInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-md font-medium mb-3 text-gray-700">Stock por Ubicación</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Almacén Principal</label>
                  <input
                    type="number"
                    name="mainWarehouseStock"
                    value={productFormData.mainWarehouseStock}
                    onChange={handleProductInputChange}
                    min="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puesto 1</label>
                  <input
                    type="number"
                    name="post1Stock"
                    value={productFormData.post1Stock}
                    onChange={handleProductInputChange}
                    min="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puesto 2</label>
                  <input
                    type="number"
                    name="post2Stock"
                    value={productFormData.post2Stock}
                    onChange={handleProductInputChange}
                    min="0"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Transfer Stock Modal */}
      <Modal
        isOpen={activeModal === "transfer"}
        onClose={closeModal}
        title={`Transferir Stock: ${selectedProduct?.name || ""}`}
        isProcessing={isProcessing}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleStockTransfer}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium text-sm"
            >
              Transferir
            </button>
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Stock disponible en almacén principal: <span className="font-semibold">
                {selectedProduct.stocks.find(s => s.location === 'main_warehouse')?.quantity || 0}
              </span>
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad para Puesto 1</label>
                <input
                  type="number"
                  name="post1Quantity"
                  value={stockTransferData.post1Quantity}
                  onChange={handleStockTransferChange}
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad para Puesto 2</label>
                <input
                  type="number"
                  name="post2Quantity"
                  value={stockTransferData.post2Quantity}
                  onChange={handleStockTransferChange}
                  min="0"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Stock Modal */}
      <Modal
        isOpen={activeModal === "add"}
        onClose={closeModal}
        title={`Agregar Stock: ${selectedProduct?.name || ""}`}
        isProcessing={isProcessing}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleStockAdd}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium text-sm"
            >
              Agregar
            </button>
          </div>
        }
      >
        {selectedProduct && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Stock actual en almacén principal: <span className="font-semibold">
                {selectedProduct.stocks.find(s => s.location === 'main_warehouse')?.quantity || 0}
              </span>
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a Agregar</label>
              <input
                type="number"
                name="quantity"
                value={stockAddData.quantity}
                onChange={handleStockAddChange}
                min="1"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}