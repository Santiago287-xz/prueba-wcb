//@ts-nocheck

import React, { useEffect, useContext } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

// Importar solo los íconos necesarios
import {
  FaHome,
  FaUsers,
  FaUserPlus,
  FaUserCog,
  FaMoneyBillWave,
  FaDumbbell,
  FaAppleAlt,
  FaCalendarAlt
} from "react-icons/fa";

// Tipos para props y contexto
interface ListItemsProps {
  isMobile?: boolean;
  onItemClick?: () => void;
}

interface MenuItemProps {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
  onItemClick?: () => void;
}

export default function ListItems({ isMobile = false, onItemClick }: ListItemsProps) {
  const { data, status } = useSession();
  const user = data?.user;
  const isLoading = status === "loading";

  // Skeleton loader
  if (isLoading) {
    return (
      <div className="flex flex-col w-full p-2">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="h-12 bg-gray-200 my-2 rounded-lg animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  // Estilos condicionales
  const itemBaseClass = isMobile
    ? "flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition my-1"
    : "flex items-center justify-center p-3 cursor-pointer hover:bg-gray-100 transition relative group my-1";

  const iconClass = isMobile
    ? "text-xl text-gray-600 mr-3"
    : "text-xl text-gray-600";

  const textClass = isMobile
    ? "text-sm font-medium text-gray-700"
    : "hidden absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded group-hover:block z-50";

  // Componente de menú
  const MenuItem = ({ href, title, icon: Icon, children, onItemClick }: MenuItemProps) => (
    <Link href={href} className="text-inherit no-underline my-1" onClick={onItemClick}>
      <div 
        className={itemBaseClass}
        title={title}
      >
        <Icon className={iconClass} />
        <span className={textClass}>{title}</span>
        {children}
      </div>
    </Link>
  );

  // Valores de roles tipados para evitar errores
  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const isRegularUser = user?.role === "user";
  const isAdminOrTrainer = isAdmin || isTrainer;

  return (
    <nav className="flex flex-col w-full">
      {/* Dashboard - para todos */}
      <MenuItem href="/" title="Dashboard" icon={FaHome} onItemClick={onItemClick} />

      {/* Ítems para admin o trainer */}
      {isAdminOrTrainer && (
        <MenuItem href="/add-user" title="Add User" icon={FaUserPlus} onItemClick={onItemClick} />
      )}

      {/* Ítem solo para admin */}
      {isAdmin && (
        <MenuItem href="/manage-user" title="Manage User" icon={FaUserCog} onItemClick={onItemClick} />
      )}

      {/* Ítem Trainers para todos */}
      <MenuItem href="/trainers" title="Trainers" icon={FaUsers} onItemClick={onItemClick} />

      {/* Más ítems para admin o trainer */}
      {isAdminOrTrainer && (
        <>
          <MenuItem href="/students" title="Students" icon={FaUsers} onItemClick={onItemClick} />
          <MenuItem href="/attendance" title="Attendance" icon={FaCalendarAlt} onItemClick={onItemClick} />
          <MenuItem href="/booking" title="Canchas" icon={FaCalendarAlt} onItemClick={onItemClick} />
        </>
      )}

      {/* Separador */}
      <div className="h-px w-full bg-gray-200 my-3"></div>
      
      {/* Título de sección solo para desktop */}
      {isAdminOrTrainer && (
        <div className={isMobile 
          ? "p-2 text-sm font-medium uppercase text-gray-500 my-1" 
          : "p-2 text-xs font-medium uppercase text-gray-500 text-center"
        }>
          Manage
        </div>
      )}
      
      {/* Ítems Manage para admin o trainer */}
      {isAdminOrTrainer && (
        <>
          <MenuItem href="/fees" title="Fees" icon={FaMoneyBillWave} onItemClick={onItemClick} />
          <MenuItem href="/exercise" title="Exercise" icon={FaDumbbell} onItemClick={onItemClick} />
          <MenuItem href="/diet" title="Diet" icon={FaAppleAlt} onItemClick={onItemClick} />
        </>
      )}
      
      {/* Ítems para usuarios comunes */}
      {isRegularUser && (
        <>
          <MenuItem href="/user/attendance" title="My Attendance" icon={FaCalendarAlt} onItemClick={onItemClick} />
          <MenuItem href="/user/fees" title="My Fees" icon={FaMoneyBillWave} onItemClick={onItemClick} />
          <MenuItem href="/user/exercise" title="My Exercise" icon={FaDumbbell} onItemClick={onItemClick} />
          <MenuItem href="/user/diet" title="My Diet Sheet" icon={FaAppleAlt} onItemClick={onItemClick} />
        </>
      )}
    </nav>
  );
}