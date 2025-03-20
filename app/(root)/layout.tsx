"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { signOut, useSession } from "next-auth/react";
import axios from "axios";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Loading from "../loading";
import { handleActiveStatus } from "@/utils";
import { debounce } from "lodash";

// Dynamic imports
import dynamic from 'next/dynamic';

const ListItems = dynamic(() => import("@/app/components/listItems"), {
  loading: () => (
    <div className="flex flex-col w-full p-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-12 bg-gray-200 my-2 rounded-lg animate-pulse"></div>
      ))}
    </div>
  ),
  ssr: false
});

// Importar solo íconos necesarios
import {
  FaBars,
  FaTimes,
  FaBell,
  FaSignOutAlt
} from "react-icons/fa";

// Tipos para notificaciones
interface Notification {
  id: string;
  notification_text: string;
  read: boolean;
  pathName: string;
  createdAt: string;
}

interface NotificationsData {
  data: Notification[];
  unRead: number;
}

interface ApiResponse {
  data: NotificationsData;
}

// Crear tema una sola vez
const defaultTheme = createTheme({
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});

// Fetcher optimizado
const fetcher = async (url: string): Promise<ApiResponse> => {
  const res = await axios.get(url, {
    headers: {
      'Cache-Control': 'max-age=30'
    }
  });
  return res as unknown as ApiResponse;
};

// Componente de Notificaciones
const NotificationsPanel: React.FC<{
  notifications: Notification[];
  onRead: (id: string) => Promise<void>;
  unreadCount: number;
}> = ({ notifications, onRead, unreadCount }) => {
  if (!notifications || notifications.length === 0) {
    return (
      <div className="absolute top-12 right-0 w-64 max-w-[calc(100vw-32px)] bg-white shadow-lg rounded-md overflow-hidden z-40">
        <div className="p-3 font-medium border-b border-gray-200">
          Notifications
        </div>
        <div className="p-3 text-center text-sm text-gray-500">
          Sin notificaciones
        </div>
        <div className="p-2 border-t border-gray-200">
          <Link 
            href="/notifications" 
            className="block p-2 text-center text-sm text-blue-600 hover:bg-blue-50 rounded"
          >
            View all notifications
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="absolute top-12 right-0 w-64 max-w-[calc(100vw-32px)] bg-white shadow-lg rounded-md overflow-hidden z-40">
      <div className="p-3 font-medium border-b border-gray-200">
        Notifications {unreadCount > 0 && `(${unreadCount})`}
      </div>
      <div className="max-h-[70vh] overflow-y-auto">
        {notifications
          .filter(n => !n.read)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(notification => (
            <Link
              key={notification.id}
              href={notification.pathName}
              onClick={() => onRead(notification.id)}
              className="block p-3 hover:bg-gray-50 text-gray-700 text-sm border-b border-gray-100"
            >
              {notification.notification_text.slice(0, 25)}
              {notification.notification_text.length > 25 && "..."}
            </Link>
          ))}
        
        {notifications.filter(n => !n.read).length === 0 && (
          <div className="p-3 text-center text-sm text-gray-500">
            Sin notificaciones
          </div>
        )}
      </div>
      <div className="p-2 border-t border-gray-200">
        <Link 
          href="/notifications" 
          className="block p-2 text-center text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
};

// Componente de Menú de Usuario
const UserMenu: React.FC<{
  user: any;
  onLogout: () => Promise<void>;
}> = ({ user, onLogout }) => (
  <div className="absolute top-12 right-0 w-48 max-w-[calc(100vw-32px)] bg-white shadow-lg rounded-md overflow-hidden z-40">
    <div className="p-3 font-medium border-b border-gray-200 truncate">
      {user?.name || "User"}
    </div>
    <div>
      <Link 
        href="/profile" 
        className="block p-3 hover:bg-gray-50 text-gray-700"
      >
        Profile
      </Link>
    </div>
    <div className="border-t border-gray-200">
      <button 
        className="flex w-full items-center p-3 text-red-600 hover:bg-red-50"
        onClick={onLogout}
      >
        <FaSignOutAlt className="mr-2" />
        <span>Logout</span>
      </button>
    </div>
  </div>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  
  // Usar SWR con opciones optimizadas
  const {
    data: notifyData,
    isLoading,
    mutate
  } = useSWR<ApiResponse>("/api/notification", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 60000,
    dedupingInterval: 10000,
    errorRetryCount: 3
  });
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Cerrar menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Cierre de menú en cambio de tamaño
  useEffect(() => {
    const handleResize = debounce(() => {
      if (window.innerWidth > 768 && menuOpen) {
        setMenuOpen(false);
      }
    }, 150);
    
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      handleResize.cancel();
    };
  }, [menuOpen]);
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
    if (notificationsOpen) setNotificationsOpen(false);
  };
  
  const toggleNotifications = () => {
    setNotificationsOpen(!notificationsOpen);
    if (userMenuOpen) setUserMenuOpen(false);
  };
  
  // Función para cerrar el menú móvil
  const handleCloseMenu = () => {
    setMenuOpen(false);
  };
  
  // Marcar notificaciones como leídas
  const handleRead = async (notificationId: string) => {
    try {
      await axios.patch(`/api/notification/${notificationId}`);
      mutate();
      setNotificationsOpen(false); // Cerrar panel de notificaciones
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };
  
  const handleLogout = async () => {
    try {
      await handleActiveStatus(router, "offline");
      await signOut();
    } catch (error) {
      console.error("Error logging out:", error);
      await signOut();
    }
  };
  
  if (isLoading) {
    return <Loading />;
  }
  
  // Datos seguros con verificaciones de tipo
  const unreadCount = notifyData?.data?.unRead || 0;
  const notifications = notifyData?.data?.data || [];
  
  return (
    <ThemeProvider theme={defaultTheme}>
      <div className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden">
        {/* Navbar fijo */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-blue-500 shadow-sm z-30 w-screen max-w-full">
          <div className="h-16 flex items-center justify-between px-4">
            <div className="flex items-center">
              <button 
                className="md:hidden flex items-center justify-center w-10 h-10 mr-3 text-white hover:bg-blue-600 rounded-full"
                onClick={toggleMenu}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                {menuOpen ? (
                  <FaTimes className="text-xl" />
                ) : (
                  <FaBars className="text-xl" />
                )}
              </button>
              <h1 className="text-xl font-medium text-white truncate">Policenter MH</h1>
            </div>
          
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button 
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-blue-600"
                  onClick={toggleNotifications}
                  aria-label="Notifications"
                >
                  <FaBell className="text-white text-lg" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {notificationsOpen && (
                  <Suspense fallback={<div className="absolute top-12 right-0 w-64 bg-white shadow-lg rounded-md p-3">Cargando...</div>}>
                    <NotificationsPanel
                      notifications={notifications}
                      onRead={handleRead}
                      unreadCount={unreadCount}
                    />
                  </Suspense>
                )}
              </div>
              
              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button 
                  className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border border-gray-300 hover:border-gray-400 focus:outline-none bg-blue-600"
                  onClick={toggleUserMenu}
                  aria-label="User menu"
                >
                  <div className="w-full h-full text-white flex items-center justify-center font-medium">
                    {sessionData?.user?.name?.charAt(0) || "U"}
                  </div>
                </button>
                
                {userMenuOpen && (
                  <Suspense fallback={<div className="absolute top-12 right-0 w-48 bg-white shadow-lg rounded-md p-3">Cargando...</div>}>
                    <UserMenu
                      user={sessionData?.user}
                      onLogout={handleLogout}
                    />
                  </Suspense>
                )}
              </div>
            </div>
          </div>
        </header>
        
        {/* Menú móvil optimizado - lazy load y cierre al hacer clic */}
        <div 
          className={`fixed top-16 left-0 right-0 bg-white shadow-md z-20 transition-transform duration-300 ease-in-out transform ${
            menuOpen ? "translate-y-0" : "-translate-y-full"
          } md:hidden overflow-y-auto`}
          style={{ height: menuOpen ? 'calc(100vh - 64px)' : '0' }}
        >
          {menuOpen && (
            <div className="p-3">
              <Suspense fallback={
                <div className="flex flex-col w-full p-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-gray-200 my-2 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              }>
                <ListItems isMobile={true} onItemClick={handleCloseMenu} />
              </Suspense>
            </div>
          )}
        </div>
        
        {/* Desktop sidebar */}
        <aside className="hidden md:block fixed top-0 left-0 w-16 h-screen bg-white shadow-md z-10">
          <div className="pt-16 h-full overflow-y-auto">
            <Suspense fallback={
              <div className="flex flex-col w-full p-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 my-1 rounded-lg animate-pulse"></div>
                ))}
              </div>
            }>
              <ListItems />
            </Suspense>
          </div>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 p-4 pt-20 md:pl-20 md:pt-20">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}