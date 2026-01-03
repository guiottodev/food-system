import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loginAction } from "./actions";

type LoginSearchParams = {
  error?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<LoginSearchParams> | LoginSearchParams;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (session?.value) {
    redirect("/admin");
  }

  const resolvedParams = await Promise.resolve(searchParams);
  const error = resolvedParams?.error;
  let message = "";
  if (error === "invalid") {
    message = "Usuário ou senha inválidos.";
  }
  if (error === "missing") {
    message = "Credenciais não configuradas. Defina ADMIN_USER, ADMIN_PASSWORD e SESSION_SECRET.";
  }

  return (
    <main style={{ maxWidth: 360, margin: "64px auto", padding: 16 }}>
      <h1>Login</h1>
      <form action={loginAction} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Usuário</span>
          <input name="username" type="text" required />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Senha</span>
          <input name="password" type="password" required />
        </label>
        {message ? <p style={{ color: "crimson" }}>{message}</p> : null}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
