export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center mt-32">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso No Autorizado</h1>
        <p className="text-gray-700 mb-6">
          No tienes permisos suficientes para acceder a esta página.
        </p>
        <div className="flex justify-between">
          <a 
            href="/" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Ir a inicio
          </a>
          <a 
            href="/signin" 
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
          >
            Iniciar sesión con otra cuenta
          </a>
        </div>
      </div>
    </div>
  );
}