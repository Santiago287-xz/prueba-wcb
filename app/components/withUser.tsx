import { useSession } from "next-auth/react";
import Empty from "@/app/components/Empty";
import { SessionUser } from "@/types";
import React from "react";
import Loading from "../loading";

interface WithUserProps<P> {
  Component: React.ComponentType<P>;
}

const WithUser = <P extends {}>({ Component }: WithUserProps<P>) => {
  const UserComponent: React.FC<P> = (props) => {
    const { data, status } = useSession();
    const sessionUser = data?.user as SessionUser;

    if (status === "loading") {
      return <Loading />;
    }

    if (sessionUser.role !== "user") {
      return (
        <Empty
          title="Unauthorized"
          subtitle="You ain't authorized for this page."
        />
      );
    }

    return <Component {...props} />;
  };
  return UserComponent;
};

export default WithUser;
