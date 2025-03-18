"use client";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="max-w-[2520px] min-h-screen flex justify-center items-center mx-auto xl:px-20 md:px-10 sm:px-2 px-4">
      {children}
    </div>
  );
}
