// Ruta: app/profile/page.tsx

import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { User, ExerciseList, UserExercise } from '@prisma/client';
import { options as authOptions } from "@/app/api/auth/[...nextauth]/options";
import prisma from '@/app/libs/prismadb';
import ClientProfilePage from './_components/ClientProfilePage';

export interface PopulatedUserExercise extends UserExercise {
  exercise: ExerciseList;
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent('/profile');
    redirect(`/api/auth/signin?callbackUrl=${callbackUrl}`);
  }

  const userId = session.user.id;
  const currentUser = session.user;

  let assignedExercises: PopulatedUserExercise[] = [];
  let fetchError = false;

  try {
    assignedExercises = await prisma.userExercise.findMany({
      where: { userId: userId },
      include: { exercise: true },
      orderBy: { exercise: { name: 'asc' } }
    });
  } catch (error) {
    console.error("Error fetching UserExercise from DB:", error);
    fetchError = true;
  }

  // Convertir a objetos planos para evitar problemas de serialización
  const serializedExercises = JSON.parse(JSON.stringify(assignedExercises));
  const serializedUser = JSON.parse(JSON.stringify(currentUser));

  return (
    <ClientProfilePage 
      initialExercises={serializedExercises} 
      user={serializedUser} 
      fetchError={fetchError} 
    />
  );
}