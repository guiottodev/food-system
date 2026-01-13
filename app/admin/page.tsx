import { cookies } from "next/headers";
import Link from "next/link";
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
      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        <Link
          href="/admin/orders"
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 6,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Pedidos
        </Link>
        <Link
          href="/admin/catalog"
          style={{
            border: "1px solid #ddd",
            padding: 12,
            borderRadius: 6,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          Catalogo
        </Link>
      </div>
    </main>
  );
}
