//@ts-nocheck

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import {
  FaHome,
  FaUserPlus,
  FaUserCog,
  FaMoneyBillWave,
  FaDumbbell,
  FaAppleAlt,
  FaCalendarAlt,
  FaClipboardList,
  FaWarehouse,
  FaShoppingCart,
  FaChartLine,
  FaCreditCard,
} from "react-icons/fa";

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

  const itemBaseClass = isMobile
    ? "flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition my-1"
    : "flex items-center justify-center p-3 cursor-pointer hover:bg-gray-100 transition relative group my-1";

  const iconClass = isMobile
    ? "text-xl text-gray-600 mr-3"
    : "text-xl text-gray-600";

  const textClass = isMobile
    ? "text-sm font-medium text-gray-700"
    : "hidden absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded group-hover:block z-50";

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

  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const isUser = user?.role === "user";
  const isReceptionist = user?.role === "receptionist";
  const isCourtManager = user?.role === "court_manager";

  return (
    <nav className="flex flex-col w-full">
      <MenuItem href="/" title="Dashboard" icon={FaHome} onItemClick={onItemClick} />

      {isAdmin && (
        <>
          <MenuItem href="/add-user" title="Add User" icon={FaUserPlus} onItemClick={onItemClick} />
          <MenuItem href="/manage-user" title="Manage User" icon={FaUserCog} onItemClick={onItemClick} />
          <MenuItem href="/rfid-management" title="RFID Management" icon={FaCreditCard} onItemClick={onItemClick} />
          <MenuItem href="/booking" title="Canchas" icon={FaCalendarAlt} onItemClick={onItemClick} />
          <MenuItem href="/sales" title="Sales" icon={FaMoneyBillWave} onItemClick={onItemClick} />
        </>
      )}

      {isTrainer && (
        <>
          <MenuItem href="/manage-user" title="Manage User" icon={FaUserCog} onItemClick={onItemClick} />
        </>
      )}
      {isReceptionist && (
        <>
          <MenuItem href="/rfid-management" title="RFID Management" icon={FaCreditCard} onItemClick={onItemClick} />
          <MenuItem href="/sales" title="Sales" icon={FaMoneyBillWave} onItemClick={onItemClick} />
        </>
      )}
      {isCourtManager && (
        <>
          <MenuItem href="/booking" title="Canchas" icon={FaCalendarAlt} onItemClick={onItemClick} />
          <MenuItem href="/sales" title="Sales" icon={FaMoneyBillWave} onItemClick={onItemClick} />
        </>
      )}
      <div className="h-px w-full bg-gray-200 my-3"></div>
      {isAdmin && (
        <MenuItem href="/analytics" title="Analytics" icon={FaChartLine} onItemClick={onItemClick} />
      )}

      {isUser && (
        <>
          <MenuItem href="/user/fees" title="My Fees" icon={FaMoneyBillWave} onItemClick={onItemClick} />
          <MenuItem href="/user/exercise" title="My Exercise" icon={FaDumbbell} onItemClick={onItemClick} />
          <MenuItem href="/user/diet" title="My Diet Sheet" icon={FaAppleAlt} onItemClick={onItemClick} />
        </>
      )}
    </nav>
  );
}