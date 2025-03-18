import ClientOnly from "@/app/components/ClientOnly/page";
import Empty from "@/app/components/Empty";
import getUser from "@/app/actions/getUser";
import UserClient from "@/app/components/User/User";

const StudentPage: React.FC<{ params: { student: string } }> = async ({
  params,
}) => {
  if (!params?.student) {
    return (
      <ClientOnly>
        <Empty
          title="No student selected"
          subtitle="Please select a student from the list"
        />
      </ClientOnly>
    );
  }

  const student = await getUser({ userId: params?.student as string });

  if (!student) {
    return (
      <ClientOnly>
        <Empty title="No User" subtitle="No Data Found" />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <UserClient user={student} />
    </ClientOnly>
  );
};

export default StudentPage;
