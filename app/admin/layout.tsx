import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { logoutAction } from "./actions";
import { verifySessionValue } from "@/lib/session";

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

  return (
    <div style={{ maxWidth: 1100, margin: "32px auto", padding: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <nav style={{ display: "flex", gap: 12 }}>
          <Link href="/admin/orders">Pedidos</Link>
          <Link href="/admin/orders/new">Novo pedido</Link>
          <Link href="/admin/categories">Categorias</Link>
          <Link href="/admin/products">Produtos</Link>
        </nav>
        <form action={logoutAction}>
          <button type="submit">Sair</button>
        </form>
      </header>
      {children}
    </div>
  );
}
