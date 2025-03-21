import { Court } from "../../types/bookings/types";

interface CourtsSelectorProps {
  courts: Court[];
  selectedCourt: Court | null;
  setSelectedCourt: (court: Court | null) => void;
  disabled: boolean;
}

export function CourtsSelector({ courts, selectedCourt, setSelectedCourt, disabled }: CourtsSelectorProps) {
  return (
    <div className="w-full md:w-64">
      <label htmlFor="court-select" className="block text-sm font-medium text-gray-700 mb-1">
        Selecciona una cancha
      </label>
      <div className="relative">
        <select
          id="court-select"
          onChange={(e) => {
            const courtId = e.target.value;
            if (!courtId) {
              setSelectedCourt(null);
              return;
            }
            
            const court = courts.find(c => c.id === courtId);
            if (court) {
              setSelectedCourt(court);
            }
          }}
          className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md shadow-sm appearance-none"
          disabled={disabled}
        >
          <option value="">Selecciona una cancha</option>
          {courts.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  );
}