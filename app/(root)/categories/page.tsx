"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, PlusCircle, Edit, Trash, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
}

export default function CategoriesManager() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Verificar si el usuario tiene permisos para gestionar categorías
  const isAuthorized = session?.user?.role === "admin" || session?.user?.role === "court_manager";

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/signin");
      return;
    }
    
    if (!isAuthorized) {
      setError("No tienes permisos para gestionar categorías");
      setLoading(false);
      return;
    }
    
    fetchCategories();
  }, [status, router, isAuthorized]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/sales/inventory/categories");
      if (!res.ok) {
        throw new Error(`Error: ${res.status} - ${res.statusText}`);
      }
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      setError("Error al cargar las categorías. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCategoryForm({ ...categoryForm, [e.target.name]: e.target.value });
  };

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    
    setProcessing(true);
    
    try {
      const res = await fetch("/api/sales/inventory/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryForm.name.trim() }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear categoría");
      }
      
      fetchCategories();
      setCategoryForm({ name: "" });
      setIsCreating(false);
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Error al crear categoría");
    } finally {
      setProcessing(false);
    }
  };

  const startEditing = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name });
  };

  const cancelEditing = () => {
    setEditingCategoryId(null);
    setCategoryForm({ name: "" });
  };

  const updateCategory = async (categoryId: string) => {
    if (!categoryForm.name.trim()) return;
    
    setProcessing(true);
    
    try {
      const res = await fetch(`/api/sales/inventory/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryForm.name.trim() }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar categoría");
      }
      
      fetchCategories();
      setEditingCategoryId(null);
      setCategoryForm({ name: "" });
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Error al actualizar categoría");
    } finally {
      setProcessing(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta categoría? Los productos asociados se quedarán sin categoría.")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/sales/inventory/categories/${categoryId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar categoría");
      }
      
      fetchCategories();
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "Error al eliminar categoría");
    }
  };

  // Loading state
  if (status === "loading" || (loading && !error)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Cargando...</p>
      </div>
    );
  }

  // Sin autorización
  if (!isAuthorized) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">No autorizado</h1>
        <p>No tienes permisos para gestionar categorías.</p>
        <button 
          onClick={() => router.push("/")}
          className="mt-4 bg-primary text-white p-2 rounded"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestor de Categorías</h1>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center bg-green-600 text-white px-4 py-2 rounded"
        >
          {isCreating ? (
            <>
              <X className="h-5 w-5 mr-2" />
              Cancelar
            </>
          ) : (
            <>
              <PlusCircle className="h-5 w-5 mr-2" />
              Nueva Categoría
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Formulario para crear nueva categoría */}
      {isCreating && (
        <div className="bg-gray-50 border rounded p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Nueva Categoría</h2>
          <form onSubmit={createCategory} className="flex items-center space-x-2">
            <input
              type="text"
              name="name"
              value={categoryForm.name}
              onChange={handleFormChange}
              placeholder="Nombre de la categoría"
              className="flex-1 border rounded p-2"
              disabled={processing}
              required
            />
            <button
              type="submit"
              disabled={processing}
              className="bg-green-600 text-white p-2 rounded flex items-center"
            >
              {processing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <PlusCircle className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      )}

      {/* Lista de categorías */}
      <div className="bg-white border rounded shadow">
        <h2 className="text-lg font-semibold p-4 border-b">Categorías Disponibles</h2>
        
        {categories.length === 0 ? (
          <p className="p-4 text-gray-500">No hay categorías disponibles.</p>
        ) : (
          <ul className="divide-y">
            {categories.map((category) => (
              <li key={category.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                {editingCategoryId === category.id ? (
                  <div className="flex items-center space-x-2 w-full">
                    <input
                      type="text"
                      name="name"
                      value={categoryForm.name}
                      onChange={handleFormChange}
                      className="flex-1 border rounded p-2"
                      disabled={processing}
                      autoFocus
                    />
                    <button
                      onClick={() => updateCategory(category.id)}
                      disabled={processing}
                      className="bg-green-100 p-2 rounded text-green-600 hover:bg-green-200"
                    >
                      {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={processing}
                      className="bg-red-100 p-2 rounded text-red-600 hover:bg-red-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-lg">{category.name}</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEditing(category)}
                        className="bg-blue-100 p-2 rounded text-blue-600 hover:bg-blue-200"
                        title="Editar categoría"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="bg-red-100 p-2 rounded text-red-600 hover:bg-red-200"
                        title="Eliminar categoría"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}