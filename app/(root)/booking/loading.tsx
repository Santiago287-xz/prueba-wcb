// app/bookings/loading.tsx
export default function Loading() {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }