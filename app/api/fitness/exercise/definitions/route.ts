// app/api/fitness/exercises/definitions/route.ts
import { NextResponse } from "next/server";
import prisma from "@/app/libs/prismadb";

export async function GET() {
  try {
    // Obtiene todos los ejercicios de la base de datos
    const exercises = await prisma.exerciseList.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        sets: true,
        reps: true,
        weight: true,
        duration: true,
        notes: true,
        // Categoría - puedes agregar campos adicionales según tu modelo
      }
    });

    // Agrega categoría si no la tienen (ejemplo para interfaz)
    const exercisesWithCategories = exercises.map(exercise => {
      // Si necesitas generar categorías predeterminadas:
      let category = "Otros";
      const name = exercise.name.toLowerCase();
      
      if (name.includes("pecho") || name.includes("press")) {
        category = "Pecho";
      } else if (name.includes("pierna") || name.includes("squat")) {
        category = "Piernas";
      } // etc.
      
      return { ...exercise, category };
    });

    return NextResponse.json({ 
      success: true,
      data: exercisesWithCategories 
    });
  } catch (error) {
    console.error("Error al obtener ejercicios:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener ejercicios" },
      { status: 500 }
    );
  }
}