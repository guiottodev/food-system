"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionValue, getSessionMaxAge } from "@/lib/session";

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const envUser = process.env.ADMIN_USER ?? "";
  const envPass = process.env.ADMIN_PASSWORD ?? "";
  const sessionSecret = process.env.SESSION_SECRET ?? "";

  if (!envUser || !envPass || !sessionSecret) {
    redirect("/login?error=missing");
  }

  if (username !== envUser || password !== envPass) {
    redirect("/login?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set("session", createSessionValue(username), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAge(),
    secure: process.env.NODE_ENV === "production",
  });

  redirect("/admin");
}
