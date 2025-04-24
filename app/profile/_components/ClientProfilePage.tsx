"use client";

import { useState, useEffect } from 'react';
import { User } from '@prisma/client';
import ExerciseCard from './ExerciseCard';
import { PopulatedUserExercise } from '../page';

// Días de la semana en español
const DAYS_OF_WEEK = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"
];

interface ClientProfilePageProps {
  initialExercises: PopulatedUserExercise[];
  user: User;
  fetchError: boolean;
}

export default function ClientProfilePage({ initialExercises, user, fetchError }: ClientProfilePageProps) {
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [exercisesByDay, setExercisesByDay] = useState<Record<string, (PopulatedUserExercise & { completed?: boolean })[]>>({});
  
  useEffect(() => {
    // Cargar ejercicios completados desde localStorage
    const storedCompleted = localStorage.getItem(`completed-exercises-${user.id}`);
    if (storedCompleted) {
      setCompletedExercises(new Set(JSON.parse(storedCompleted)));
    }
  
    // Organizar ejercicios por día - en una app real, esto vendría de la base de datos
    const byDay: Record<string, (PopulatedUserExercise & { completed?: boolean; dayOfWeek?: string })[]> = {};
    
    // Inicializar todos los días
    DAYS_OF_WEEK.forEach(day => {
      byDay[day] = [];
    });
    
    // Distribuir ejercicios (en una app real, el día vendría de la base de datos)
    initialExercises.forEach(exercise => {
      // Esto es solo para demostración - en una app real, el día se guardaría en la base de datos
      // Aquí estamos usando el ID del ejercicio para asignar determinísticamente un día
      const dayIndex = exercise.id ? 
        parseInt(exercise.id.substring(exercise.id.length - 1), 16) % 7 : 
        Math.floor(Math.random() * 7);
      
      const day = DAYS_OF_WEEK[dayIndex];
      
      const isCompleted = storedCompleted ? 
        JSON.parse(storedCompleted).includes(exercise.id) : 
        false;
      
      const exerciseWithDay = {
        ...exercise,
        dayOfWeek: day,
        completed: isCompleted
      };
      
      byDay[day].push(exerciseWithDay);
    });
    
    setExercisesByDay(byDay);
  }, [initialExercises, user.id]);

  const handleToggleCompletion = (id: string, completed: boolean) => {
    const newCompleted = new Set(completedExercises);
    
    if (completed) {
      newCompleted.add(id);
    } else {
      newCompleted.delete(id);
    }
    
    setCompletedExercises(newCompleted);
    localStorage.setItem(`completed-exercises-${user.id}`, JSON.stringify(Array.from(newCompleted)));
    
    // Actualizar los ejercicios por día
    const updated = { ...exercisesByDay };
    
    DAYS_OF_WEEK.forEach(day => {
      updated[day] = exercisesByDay[day].map(ex => 
        ex.id === id ? { ...ex, completed } : ex
      );
    });
    
    setExercisesByDay(updated);
  };

  // Calcular estadísticas de progreso
  const totalExercises = initialExercises.length;
  const completedCount = completedExercises.size;
  const completionPercentage = totalExercises > 0 
    ? Math.round((completedCount / totalExercises) * 100) 
    : 0;

  // Día actual en español
  const today = new Date().getDay(); // 0 = Domingo, 1 = Lunes, ...
  const todayIndex = today === 0 ? 6 : today - 1; // Convertir a nuestro índice (0 = Lunes)
  const todayName = DAYS_OF_WEEK[todayIndex];

  return (
    // Fondo gris claro
    <div className="bg-gray-50 min-h-screen py-8 md:py-10">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Encabezado con Barra de Progreso */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Tu Perfil
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Aquí puedes ver tu información y rutina asignada.
          </p>
          
          {/* Barra de Progreso */}
          {totalExercises > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Progreso semanal</span>
                <span className="text-sm font-medium text-gray-700">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${completionPercentage}%` }}
                ></div>
              </div>
              <p className="mt-1 text-xs text-gray-500 text-right">
                {completedCount} de {totalExercises} ejercicios completados
              </p>
            </div>
          )}
        </div>

        {/* Layout Principal: 1 columna en móvil, 3 en pantallas grandes */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">

          {/* Columna de Información del Usuario (1/3 ancho en lg) */}
          <section aria-labelledby="user-info-heading" className="lg:col-span-1 flex flex-col gap-4">
            {/* Tarjeta Blanca con Sombra y Bordes Redondeados */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden flex-grow">
              <div className="p-6">
                <h2 id="user-info-heading" className="text-lg font-semibold text-gray-900 mb-4">
                  Información Personal
                </h2>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-medium uppercase text-gray-500">Nombre</dt>
                    <dd className="mt-1 text-base text-gray-900">{user?.name || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-gray-500">Email</dt>
                    <dd className="mt-1 text-base text-gray-900">{user?.email || '-'}</dd>
                  </div>
                  {user?.role && (
                    <div>
                      <dt className="text-xs font-medium uppercase text-gray-500">Tipo de Cuenta</dt>
                      <dd className="mt-1">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-800 capitalize">
                          {user.role.toString().toLowerCase()}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
            
            {/* Tarjeta de Estadísticas */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Mi Progreso
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <span className="block text-2xl font-bold text-green-700">{completedCount}</span>
                    <span className="text-xs text-green-600">Completados</span>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <span className="block text-2xl font-bold text-blue-700">{totalExercises}</span>
                    <span className="text-xs text-blue-600">Total</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tarjeta de Ejercicios de Hoy - Solo visible en Móvil */}
            {exercisesByDay[todayName]?.length > 0 && (
              <div className="bg-white shadow-md rounded-lg overflow-hidden lg:hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Hoy - {todayName}
                    </h2>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {exercisesByDay[todayName].filter(ex => ex.completed).length}/{exercisesByDay[todayName].length}
                    </span>
                  </div>
                  
                  <ul className="space-y-3">
                    {exercisesByDay[todayName].map(exercise => (
                      <li key={exercise.id}>
                        <ExerciseCard 
                          assignment={exercise} 
                          onToggleCompletion={handleToggleCompletion}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          {/* Columna de Ejercicios (2/3 ancho en lg) */}
          <section aria-labelledby="exercise-routine-heading" className="lg:col-span-2">
            {/* Tarjeta Blanca */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 id="exercise-routine-heading" className="text-lg font-semibold text-gray-900 mb-5">
                  Mi Rutina de Ejercicios
                </h2>
                
                {fetchError ? (
                  <div className="rounded-md bg-red-50 p-4 border border-red-200">
                    <p className="text-sm font-medium text-red-700 text-center">
                      Error al cargar la rutina. Intenta recargar la página.
                    </p>
                  </div>
                ) : totalExercises === 0 ? (
                  <div className="rounded-md bg-gray-50 p-6 border border-dashed border-gray-300 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="mt-2 text-sm font-medium text-gray-600">
                      Tu rutina está vacía.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">Pídele a tu entrenador que te asigne ejercicios.</p>
                  </div>
                ) : (
                  // Ejercicios organizados por día
                  <div className="space-y-6">
                    {DAYS_OF_WEEK.map(day => {
                      const dayExercises = exercisesByDay[day] || [];
                      
                      if (dayExercises.length === 0) return null;
                      
                      const completedForDay = dayExercises.filter(ex => ex.completed).length;
                      const totalForDay = dayExercises.length;
                      const dayProgress = Math.round((completedForDay / totalForDay) * 100);
                      
                      // Añadir clase destacada para hoy
                      const isToday = day === todayName;
                      
                      return (
                        <div key={day} className={`border rounded-lg overflow-hidden ${
                          isToday ? 'border-blue-300 ring-1 ring-blue-300' : 'border-gray-200'
                        }`}>
                          <div className={`px-4 py-3 border-b ${
                            isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex justify-between items-center">
                              <h3 className={`text-sm font-medium ${isToday ? 'text-blue-800' : 'text-gray-700'}`}>
                                {day} {isToday && <span className="ml-1 text-xs">(Hoy)</span>}
                              </h3>
                              <span className="text-xs font-medium text-gray-500">
                                {completedForDay}/{totalForDay} completados
                              </span>
                            </div>
                            {/* Barra de progreso para cada día */}
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                  isToday ? 'bg-blue-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${dayProgress}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <ul className="divide-y divide-gray-100">
                            {dayExercises.map(exercise => (
                              <li key={exercise.id} className="p-3">
                                <ExerciseCard 
                                  assignment={exercise} 
                                  onToggleCompletion={handleToggleCompletion}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}