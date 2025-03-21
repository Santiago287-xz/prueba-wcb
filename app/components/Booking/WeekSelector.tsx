import { format, startOfWeek, addDays } from "date-fns";
import { es } from 'date-fns/locale';

interface WeekSelectorProps {
  weekStart: Date;
  setWeekStart: (date: Date) => void;
  disabled: boolean;
}

export function WeekSelector({ weekStart, setWeekStart, disabled }: WeekSelectorProps) {
  return (
    <div className="flex-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Semana
      </label>
      <div className="flex items-center bg-white rounded-md shadow-sm border border-gray-300 p-1">
        <button 
          onClick={() => !disabled && setWeekStart(addDays(weekStart, -7))}
          disabled={disabled} 
          className="p-1 rounded-l hover:bg-gray-100 transition"
          title="Semana anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        
        <div className="flex-1 flex justify-center items-center font-medium">
          <span className="text-sm">
            {format(weekStart, "d 'de' MMMM", { locale: es })} - {format(addDays(weekStart, 6), "d 'de' MMMM, yyyy", { locale: es })}
          </span>
        </div>
        
        <button 
          onClick={() => !disabled && setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          disabled={disabled}
          className="mx-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-xs transition"
          title="Semana actual"
        >
          Hoy
        </button>
        
        <button 
          onClick={() => !disabled && setWeekStart(addDays(weekStart, 7))}
          disabled={disabled}
          className="p-1 rounded-r hover:bg-gray-100 transition"
          title="Semana siguiente"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}