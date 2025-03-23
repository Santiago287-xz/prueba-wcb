import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  stocks?: {
    id: string;
    location: string;
    quantity: number;
  }[];
}

async function fetchProducts() {
  try {
    // Get the absolute URL for API calls in server components
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || process.env.HOST || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    const res = await fetch(`${baseUrl}/api/inventory/products`, {
      cache: "no-store",
    });
    
    if (!res.ok) {
      throw new Error(`Error al obtener los productos: ${res.statusText}`);
    }
    
    const products: Product[] = await res.json();
    return products;
  } catch (error) {
    console.error("Error en fetchProducts:", error);
    return []; // Devuelve un array vacío en caso de error
  }
}

export default async function ProductsPage() {
  const products = await fetchProducts();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Productos Disponibles</h1>
      {products.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">No hay productos disponibles.</p>
          <p className="text-sm text-gray-400">Agrega productos desde el panel de administración.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="border p-4 rounded shadow hover:shadow-md transition-shadow">
              {product.image ? (
                <div className="relative w-full h-48 mb-4">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover rounded"
                    priority={false}
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center mb-4 rounded">
                  <p className="text-gray-500">Sin imagen</p>
                </div>
              )}
              <h2 className="text-xl font-semibold">{product.name}</h2>
              {product.category && (
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-2">
                  {product.category.name}
                </span>
              )}
              <p className="text-gray-600 mb-2 line-clamp-2">{product.description}</p>
              <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
              
              {product.stocks && (
                <div className="mt-2 text-sm text-gray-500">
                  <p>Stock disponible: {product.stocks.reduce((total, stock) => total + stock.quantity, 0)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}