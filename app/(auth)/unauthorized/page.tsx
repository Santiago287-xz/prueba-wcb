"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: "/signin" });
    } catch (error) {
      console.error("Error logging out:", error);
      router.push("/signin");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="bg-gray-100 p-8 rounded-lg shadow-lg max-w-md w-full">
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
          <button 
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
          >
            Iniciar sesión con otra cuenta
          </button>
        </div>
      </div>
    </div>
  );
}