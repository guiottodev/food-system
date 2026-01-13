import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionValue } from "@/lib/session";

export async function requireAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) {
    redirect("/login");
  }

  const sessionData = verifySessionValue(session.value);
  if (!sessionData) {
    redirect("/login");
  }

  return sessionData;
}
