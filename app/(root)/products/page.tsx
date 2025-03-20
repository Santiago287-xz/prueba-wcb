async function fetchProducts() {
  try {
    const res = await fetch("/api/inventory/products", {
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
        <p>No hay productos disponibles.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((product) => (
            <div key={product.id} className="border p-4 rounded shadow">
              {product.image && (
                <Image
                  src={product.image}
                  alt={product.name}
                  width={200}
                  height={200}
                  className="w-full h-48 object-cover mb-4"
                />
              )}
              <h2 className="text-xl font-semibold">{product.name}</h2>
              <p className="text-gray-600">{product.description}</p>
              <p className="text-lg font-bold mt-2">${product.price}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}