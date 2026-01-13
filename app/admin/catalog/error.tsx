"use client";

export default function Error({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main style={{ display: "grid", gap: 12 }}>
      <h1>Catalogo</h1>
      <p>Erro ao carregar catalogo.</p>
      <button type="button" onClick={() => reset()}>
        Tentar novamente
      </button>
    </main>
  );
}
