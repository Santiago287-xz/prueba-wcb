import { getServerSession } from "next-auth/next";
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import { redirect } from "next/navigation";
import { BookingCalendar } from "@/app/components/Booking/calendar";

export default async function BookingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !['admin', 'court_manager'].includes(session.user?.role)) {
    redirect('/unauthorized');
  }
  
  const courts = await fetchCourts();
  
  return (
    <div>
      <h1 className="text-3xl font-bold p-6">Sistema de Reservas</h1>
      <BookingCalendar initialCourts={courts} />
    </div>
  );
}

async function fetchCourts() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/courts`, { 
      cache: 'no-store',
    });
    return await res.json();
  } catch (error) {
    return [];
  }
}