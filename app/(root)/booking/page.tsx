// app/(root)/booking/page.tsx
import { Suspense } from 'react';
import { Calendar } from "@/app/components/Booking";
import Loading from './loading';
import prisma from "@/app/libs/prismadb";

async function fetchCourts() {
  try {
    return await prisma.court.findMany();
  } catch (error) {
    console.error('Error fetching courts:', error);
    return [];
  }
}

export default async function BookingsPage() {
  const courts = await fetchCourts();

  return (
    <Suspense fallback={<Loading />}>
      <Calendar initialCourts={courts} />
    </Suspense>
  );
}