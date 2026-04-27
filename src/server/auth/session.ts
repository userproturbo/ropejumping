import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

export const getCurrentSession = async () => {
  return auth();
};

export const getCurrentUser = async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
};

export const requireCurrentUser = async (callbackUrl = "/profile") => {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return user;
};
