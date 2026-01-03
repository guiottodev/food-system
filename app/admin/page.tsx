import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutAction } from "./actions";
import { verifySessionValue } from "@/lib/session";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value || !verifySessionValue(session.value)) {
    redirect("/login");
  }

  return (
    <main style={{ maxWidth: 720, margin: "64px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Painel</h1>
        <form action={logoutAction}>
          <button type="submit">Sair</button>
        </form>
      </div>
      <p>Bem-vindo ao sistema interno.</p>
    </main>
  );
}
