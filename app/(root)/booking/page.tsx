import { BookingCalendar } from "@/app/components/Booking/calendar";

export default async function BookingsPage() {
  const courts = await fetchCourts();

  return (
    <BookingCalendar initialCourts={courts} />
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