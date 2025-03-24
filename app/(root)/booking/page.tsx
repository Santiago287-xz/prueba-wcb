// app/bookings/page.tsx
import { Suspense } from 'react';
import { Calendar } from "@/app/components/Booking";
import Loading from './loading';

// Optimize server-side data fetching with proper caching
async function fetchCourts() {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/courts`, {
      // Use Next.js 14 data fetching with revalidation
      next: { revalidate: 60 }, // Revalidate every minute
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) throw new Error('Failed to fetch courts');
    return await res.json();
  } catch (error) {
    console.error('Error fetching courts:', error);
    return [];
  }
}

export default async function BookingsPage() {
  // Get initial data server-side
  const courts = await fetchCourts();

  return (
    <Suspense fallback={<Loading />}>
      <Calendar initialCourts={courts} />
    </Suspense>
  );
}