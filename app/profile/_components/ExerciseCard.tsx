// Ruta: app/profile/_components/ExerciseCard.tsx

import React from 'react';
import { ExerciseList, UserExercise } from '@prisma/client';

// Icons for exercise details
const SetsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>;
const RepsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const WeightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const UncheckedIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export interface PopulatedUserExercise extends UserExercise {
  exercise: ExerciseList;
  dayOfWeek?: string; // Campo adicional para el día de la semana
  completed?: boolean; // Estado de completado
}

interface ExerciseCardProps {
  assignment: PopulatedUserExercise;
  onToggleCompletion?: (id: string, completed: boolean) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ assignment, onToggleCompletion }) => {
  const { id, exercise, sets, reps, notes, weight, completed = false } = assignment;

  if (!exercise) {
    return <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-red-700 text-sm">Error al cargar el ejercicio</div>;
  }

  const handleToggleCompletion = () => {
    if (onToggleCompletion) {
      onToggleCompletion(id, !completed);
    }
  };

  return (
    // Card con estilo condicional basado en el estado de completado
    <div className={`border rounded-lg p-4 shadow-sm transition-all ${
      completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
    }`}>
      {/* Contenido Principal con Botón de Completado */}
      <div className="flex items-start justify-between">
        {/* Detalles del Ejercicio */}
        <div className="flex-grow pr-2">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            {/* Nombre y Descripción */}
            <div className="mb-3 sm:mb-0 sm:mr-4">
              <h3 className={`text-md font-semibold leading-tight ${
                completed ? 'text-green-800' : 'text-gray-800'
              }`}>
                {exercise.name}
              </h3>
              {exercise.description && (
                <p className={`text-xs mt-1 max-w-xs ${
                  completed ? 'text-green-600' : 'text-gray-500'
                }`}> 
                  {exercise.description}
                </p>
              )}
            </div>

            {/* Métricas del Ejercicio */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mt-2 sm:mt-0 sm:flex-shrink-0 sm:justify-end">
              {sets != null && (
                <div className="flex items-center" title="Series">
                  <SetsIcon />
                  <span className={`ml-1 font-medium ${
                    completed ? 'text-green-700' : 'text-gray-700'
                  }`}>{sets}</span>
                </div>
              )}
              {reps != null && (
                <div className="flex items-center" title="Repeticiones">
                  <RepsIcon />
                  <span className={`ml-1 font-medium ${
                    completed ? 'text-green-700' : 'text-gray-700'
                  }`}>{reps}</span>
                </div>
              )}
              {weight != null && weight > 0 && (
                <div className="flex items-center" title="Peso">
                  <WeightIcon />
                  <span className={`ml-1 font-medium ${
                    completed ? 'text-green-700' : 'text-gray-700'
                  }`}>
                    {weight}<span className={`text-xs ${
                      completed ? 'text-green-600' : 'text-gray-500'
                    }`}>kg</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notas (si existen) */}
          {notes && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className={`text-xs italic ${
                completed ? 'text-green-600' : 'text-gray-600'
              }`}>
                <span className={`font-semibold not-italic ${
                  completed ? 'text-green-700' : 'text-gray-700'
                }`}>Notas:</span> {notes}
              </p>
            </div>
          )}
        </div>

        {/* Botón para marcar como completado */}
        <button 
          onClick={handleToggleCompletion}
          className={`flex-shrink-0 ml-2 p-1.5 rounded-full transition-colors ${
            completed 
              ? 'bg-green-100 text-green-600 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          aria-label={completed ? "Marcar como incompleto" : "Marcar como completado"}
          title={completed ? "Completado" : "Marcar como completado"}
        >
          {completed ? <CheckIcon /> : <UncheckedIcon />}
        </button>
      </div>
    </div>
  );
};

export default ExerciseCard;