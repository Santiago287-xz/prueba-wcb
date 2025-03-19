import BookingCalendar from "@/app/components/BookingCalendar";

export default function BookingsPage() {
  return (
    <div className="flex gap-2">
      <BookingCalendar courtType="padel" />
      <BookingCalendar courtType="futbol" />
    </div>
  );
}