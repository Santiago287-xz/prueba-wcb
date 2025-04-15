import AdminTrainerDashboard from "@/app/components/AdminTrainerDashboard";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/app/components/ClientOnly/page";
import Empty from "@/app/components/Empty";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <ClientOnly>
        <Empty title={'Loading...'} subtitle={'...'} />
      </ClientOnly>
    );
  }

  // Redirección basada en roles
  if (user.role === 'admin') {
    redirect('/analytics'); // Ya implementado según mencionaste
  } else if (user.role === 'receptionist') {
    redirect('/rfid-management');
  } else if (user.role === 'trainer') {
    redirect('/manage-user');
  }

  // Si el usuario tiene otro rol (por ejemplo, 'user'), mostramos el dashboard correspondiente
  return (
    <ClientOnly>
      <Empty title={'Welcome'} subtitle={'Please use the menu to navigate'} />
    </ClientOnly>
  );
}