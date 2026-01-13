"use client";

export default function Error({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <main style={{ display: "grid", gap: 12 }}>
      <h1>Pedido</h1>
      <p>Erro ao carregar pedido.</p>
      <button type="button" onClick={() => reset()}>
        Tentar novamente
      </button>
    </main>
  );
}
