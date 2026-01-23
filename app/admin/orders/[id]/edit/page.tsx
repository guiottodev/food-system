import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OrderForm, { type OrderFormInitialData } from "../../new/OrderForm";
import { DEFAULT_DELIVERY_TIME } from "@/lib/domain/order";
import { updateOrderAction } from "./actions";
import styles from "../../../_styles/adminPrimitives.module.css";

function formatDateInput(value?: Date | null) {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type OrdersEditSearchParams = {
  error?: string;
};

export default async function EditOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<OrdersEditSearchParams> | OrdersEditSearchParams;
}) {
  const p = await Promise.resolve(params);
  const id = p?.id;
  if (!id) {
    redirect("/admin/orders?error=missing_id");
  }

  const resolvedParams = await Promise.resolve(searchParams);
  const error = resolvedParams?.error;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        include: {
          sku: {
            include: {
              product: {
                include: { category: true },
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    redirect("/admin/orders?error=missing_id");
  }

  const scheduleDate =
    order.orderType === "ENCOMENDA"
      ? formatDateInput(order.deliveryDatetime)
      : "";
  const scheduleTime =
    order.orderType === "ENCOMENDA" &&
    order.deliveryTime &&
    order.deliveryTime !== DEFAULT_DELIVERY_TIME
      ? order.deliveryTime
      : "";

  const initialItems = order.items.map((item) => {
    const sku = item.sku;
    return {
      lineId: item.id,
      skuId: item.skuId ?? "",
      skuLabel: item.snapshotSkuName,
      productName: item.snapshotProductName ?? sku?.product?.name ?? "",
      categoryName: sku?.product?.category?.name ?? "",
      unitLabel: item.snapshotUnitLabel,
      unitType: item.snapshotUnitType,
      quantityStep: Number(sku?.quantityStep ?? 1),
      minQty: Number(sku?.minQty ?? 1),
      quantity: String(item.quantity),
      priceAtTime: Number(item.snapshotUnitPrice),
    };
  });

  const initialData: OrderFormInitialData = {
    orderId: order.id,
    orderStatus: order.status,
    customerMode: "existing",
    customerId: order.customerId,
    customerSearch: order.customer.name,
    customerName: order.customer.name,
    customerPhone: order.customer.phone,
    deliveryMethod: order.deliveryMethod,
    orderType: order.orderType,
    saveAddressAsDefault: false,
    scheduleDate,
    scheduleTime,
    addressText: order.addressText ?? "",
    addressBairro: order.addressBairro ?? "",
    addressReferencia: order.addressReferencia ?? "",
    addressCity: order.addressCity ?? "",
    addressCep: order.addressCep ?? "",
    deliveryFee: order.deliveryFee ? String(order.deliveryFee) : "",
    paymentMethod: order.paymentMethod ?? "",
    hasDeposit: order.hasDeposit ?? false,
    depositAmount: order.depositAmount ? String(order.depositAmount) : "",
    notes: order.notes ?? "",
    categoryId: "",
    items: initialItems,
  };

  let errorMessage = "";
  if (error === "sku-invalido") {
    errorMessage = "SKU invalido.";
  }
  if (error === "quantidade-invalida") {
    errorMessage = "Quantidade invalida para o SKU.";
  }
  if (error === "preco-invalido") {
    errorMessage = "Informe um preco unitario valido.";
  }
  if (error === "final-edit") {
    errorMessage = "Para editar um pedido finalizado, confirme e informe o motivo.";
  }
  if (error === "data-invalida") {
    errorMessage = "Informe a data.";
  }
  if (error === "data-passada") {
    errorMessage = "Selecione uma data e horario no futuro.";
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
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Editar pedido {order.orderNumber}</h1>
      </div>
      {errorMessage ? (
        <p className={styles.textError}>{errorMessage}</p>
      ) : null}
      <OrderForm
        mode="edit"
        action={updateOrderAction}
        customers={[
          {
            id: order.customer.id,
            name: order.customer.name,
            phone: order.customer.phone,
          },
        ]}
        errorCode={error}
        initialData={initialData}
      />
    </main>
  );
}
