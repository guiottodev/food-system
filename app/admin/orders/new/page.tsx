import { prisma } from "@/lib/prisma";
import OrderForm from "./OrderForm";
import styles from "../../_styles/adminPrimitives.module.css";

type OrdersNewSearchParams = {
  error?: string;
  existingCustomerId?: string;
  existingCustomerName?: string;
};

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams?: Promise<OrdersNewSearchParams> | OrdersNewSearchParams;
}) {
  const resolvedParams = await Promise.resolve(searchParams);
  const customers = await prisma.customer.findMany({
    orderBy: { name: "asc" },
  });

  const error = resolvedParams?.error;
  const existingCustomerId = resolvedParams?.existingCustomerId;
  const existingCustomerName = resolvedParams?.existingCustomerName
    ? decodeURIComponent(resolvedParams.existingCustomerName)
    : undefined;
  let errorMessage = "";
  if (error === "sem-itens") {
    errorMessage = "Adicione pelo menos 1 item ao pedido.";
  }
  if (error === "cliente-invalido") {
    errorMessage = "Informe um cliente valido.";
  }
  if (error === "cliente-telefone") {
    errorMessage = "Informe um telefone valido.";
  }
  if (error === "cliente-telefone-existente") {
    errorMessage = "Telefone ja cadastrado.";
  }
  if (error === "sku-invalido") {
    errorMessage = "SKU invalido.";
  }
  if (error === "quantidade-invalida") {
    errorMessage = "Quantidade invalida para o SKU.";
  }
  if (error === "data-invalida") {
    errorMessage = "Informe a data.";
  }
  if (error === "hora-invalida") {
    errorMessage = "Informe o horario.";
  }
  if (error === "data-passada") {
    errorMessage = "Selecione uma data e horario no futuro.";
  }
  if (error === "endereco-invalido") {
    errorMessage = "Informe o endereco.";
  }
  if (error === "cidade-invalida") {
    errorMessage = "Informe a cidade.";
  }
  if (error === "taxa-vazia") {
    errorMessage = "Informe a taxa de entrega (0 ou mais).";
  }
  if (error === "taxa-negativa") {
    errorMessage = "Informe uma taxa valida (0 ou mais).";
  }
  if (error === "taxa-invalida") {
    errorMessage = "Informe um valor numerico.";
  }
  if (error === "pagamento-invalido") {
    errorMessage = "Selecione uma forma de pagamento valida.";
  }
  if (error === "sinal-invalido") {
    errorMessage = "Informe um valor de sinal valido.";
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>Novo pedido</h1>
      {errorMessage ? (
        <p className={styles.textError}>{errorMessage}</p>
      ) : null}
      <OrderForm
        errorCode={error}
        existingCustomer={
          existingCustomerId
            ? {
                id: existingCustomerId,
                name: existingCustomerName ?? "Cliente existente",
              }
            : undefined
        }
        customers={customers.map((customer) => ({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
        }))}
      />
    </main>
  );
}
