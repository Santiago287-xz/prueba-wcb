import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role?: string;
      post?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    post?: string | null;
  }
}