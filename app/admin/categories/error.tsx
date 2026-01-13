"use client";

export default function Error({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main style={{ display: "grid", gap: 12 }}>
      <h1>Categorias</h1>
      <p>Erro ao carregar categorias.</p>
      <button type="button" onClick={() => reset()}>
        Tentar novamente
      </button>
    </main>
  );
}
