import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutAction } from "./actions";
import { verifySessionValue } from "@/lib/session";
import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value || !verifySessionValue(session.value)) {
    redirect("/login");
  }

  return <AdminShell logoutAction={logoutAction}>{children}</AdminShell>;
}
