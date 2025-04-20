"use client";

import React, { useState, useRef, useEffect, Suspense, lazy } from "react";
import Link from "next/link";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { FaBars, FaTimes, FaSignOutAlt } from "react-icons/fa";

function AuthCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return null;
  }

  return status === 'authenticated' ? <>{children}</> : null;
}

const ListItems = lazy(() => import("@/app/components/listItems"));

const defaultTheme = createTheme({
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});

const UserMenu = ({ user, onLogout }) => (
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

const SidebarSkeleton = () => (
  <div className="w-16 h-full bg-white pt-16">
    <div className="flex flex-col w-full p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-10 bg-gray-200 my-1 rounded-lg animate-pulse"></div>
      ))}
    </div>
  </div>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthCheck>
      <DashboardContent>{children}</DashboardContent>
    </AuthCheck>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { data: sessionData } = useSession();
  const router = useRouter();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
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
  
  const toggleMenu = () => setMenuOpen(!menuOpen);
  
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };
  
  const handleCloseMenu = () => setMenuOpen(false);
  
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error logging out:", error);
      await signOut();
    }
  };
  
  return (
    <ThemeProvider theme={defaultTheme}>
      <div className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden">
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
          
            <div className="flex items-center">
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
                  <UserMenu
                    user={sessionData?.user}
                    onLogout={handleLogout}
                  />
                )}
              </div>
            </div>
          </div>
        </header>
        
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
        
        <aside className="hidden md:block fixed top-0 left-0 w-16 h-screen bg-white shadow-md z-10">
          <div className="pt-16 h-full overflow-y-auto">
            <Suspense fallback={<SidebarSkeleton />}>
              <ListItems />
            </Suspense>
          </div>
        </aside>
        
        <main className="flex-1 p-4 pt-20 md:pl-20 md:pt-20">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}