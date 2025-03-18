import { useSession } from "next-auth/react";
import Empty from "@/app/components/Empty";
import { SessionUser } from "@/types";
import React from "react";
import Loading from "../loading";

interface WithAdminTrainerProps<P> {
  Component: React.ComponentType<P>;
}

const WithAdminTrainer = <P extends {}>({
  Component,
}: WithAdminTrainerProps<P>) => {
  const AdminTrainerComponent: React.FC<P> = (props) => {
    const { data, status } = useSession();
    const sessionUser = data?.user as SessionUser;

    if (status === "loading") {
      return <Loading />;
    }

    const isAdminOrTrainer =
      sessionUser.role === "admin" || sessionUser.role === "trainer";

    if (!isAdminOrTrainer) {
      return (
        <Empty
          title="Unauthorized"
          subtitle="You ain't authorized for this page."
        />
      );
    }

    return <Component {...props} />;
  };
  return AdminTrainerComponent;
};

export default WithAdminTrainer;
