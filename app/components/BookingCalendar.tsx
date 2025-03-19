"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { format, addHours, isSameHour } from "date-fns";

interface Court {
  id: string;
  name: string;
  reservations: { startTime: string; endTime: string }[];
}

export default function BookingCalendar({ courtType }: { courtType: "padel" | "futbol" }) {
  const { data: session } = useSession();
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate]);

  const fetchAvailability = async () => {
    const res = await fetch(
      `/api/bookings?date=${format(selectedDate, "yyyy-MM-dd")}&courtType=${courtType}`
    );
    const data = await res.json();
    setCourts(data);
  };

  const handleBooking = async (courtId: string, hour: number) => {
    if (!session?.user?.id) {
      alert("Debes iniciar sesión para reservar");
      return;
    }

    const startTime = new Date(selectedDate.setHours(hour, 0, 0));
    const endTime = addHours(startTime, 1);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courtId,
        userId: session.user.id,
        startTime,
        endTime,
      }),
    });

    if (res.ok) {
      fetchAvailability();
    } else {
      alert("Error al reservar");
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
  <h2 className="text-2xl font-bold text-gray-800 mb-6">
    Reservas para {courtType === "padel" ? "Pádel" : "Fútbol"}
  </h2>
  
  <div className="mb-6">
    <input
      type="date"
      className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      onChange={(e) => setSelectedDate(new Date(e.target.value))}
      value={format(selectedDate, "yyyy-MM-dd")}
    />
  </div>
  
  <div className="overflow-x-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Hora</th>
          {courts.map((court) => (
            <th key={court.id} className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">
              {court.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hours.map((hour, index) => (
          <tr key={hour} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
            <td className="px-4 py-3 border-b border-gray-200 font-medium">
              {`${hour}:00 - ${hour + 1}:00`}
            </td>
            {courts.map((court) => {
              const isBooked = court.reservations.some((reservation) =>
                isSameHour(new Date(reservation.startTime), new Date(selectedDate.setHours(hour)))
              );
              return (
                <td key={court.id} className="px-4 py-3 border-b border-gray-200 text-center">
                  {isBooked ? (
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
                      Reservado
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBooking(court.id, hour)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
                    >
                      Reservar
                    </button>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
  );
}