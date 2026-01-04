import { prisma } from "@/lib/prisma";
import OrderForm from "./OrderForm";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }> | { error?: string };
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });
  const skus = await prisma.sku.findMany({
    where: { isActive: true, product: { isActive: true } },
    orderBy: { displayName: "asc" },
  });

  const error = resolvedParams?.error;
  let errorMessage = "";
  if (error === "sem-itens") {
    errorMessage = "Adicione ao menos um item.";
  }
  if (error === "cliente-invalido") {
    errorMessage = "Informe um cliente válido.";
  }
  if (error === "sku-invalido") {
    errorMessage = "SKU inválido.";
  }
  if (error === "quantidade-invalida") {
    errorMessage = "Quantidade inválida para o SKU.";
  }
  if (error === "data-invalida") {
    errorMessage = "Informe data e hora de entrega.";
  }
  if (error === "endereco-invalido") {
    errorMessage = "Informe o endereço para entrega.";
  }

  return (
    <main>
      <h1>Novo pedido</h1>
      {errorMessage ? (
        <p style={{ color: "crimson" }}>{errorMessage}</p>
      ) : null}
      <OrderForm
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
        }))}
        skus={skus.map((sku) => ({
          id: sku.id,
          displayName: sku.displayName,
          unitLabel: sku.unitLabel,
          unitType: sku.unitType,
          quantityStep: Number(sku.quantityStep),
          minQty: Number(sku.minQty),
          priceCurrent: Number(sku.priceCurrent),
        }))}
      />
    </main>
  );
}
