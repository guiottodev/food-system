"use client";

import { useMemo, useState } from "react";
import { createOrderAction } from "./actions";
import { validateQtyByUnit } from "@/lib/quantity";

type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
};

type SkuOption = {
  id: string;
  displayName: string;
  unitLabel: string;
  unitType: string;
  quantityStep: number;
  minQty: number;
  priceCurrent: number;
};

type OrderItem = {
  skuId: string;
  skuLabel: string;
  unitLabel: string;
  unitType: string;
  quantityStep: number;
  minQty: number;
  quantity: string;
  priceAtTime: number;
};

export default function OrderForm({
  customers,
  skus,
}: {
  customers: CustomerOption[];
  skus: SkuOption[];
}) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing"
  );
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDatetime, setDeliveryDatetime] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"ENTREGA" | "RETIRADA">(
    "ENTREGA"
  );
  const [addressText, setAddressText] = useState("");
  const [addressBairro, setAddressBairro] = useState("");
  const [addressReferencia, setAddressReferencia] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [orderType, setOrderType] = useState<"PRONTA_ENTREGA" | "ENCOMENDA">(
    "PRONTA_ENTREGA"
  );
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [skuSearch, setSkuSearch] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [qtyError, setQtyError] = useState("");

  const filteredSkus = useMemo(() => {
    if (!skuSearch) {
      return skus;
    }
    const search = skuSearch.toLowerCase();
    return skus.filter((sku) => sku.displayName.toLowerCase().includes(search));
  }, [skus, skuSearch]);

  const subtotal = items.reduce((sum, item) => {
    const result = validateQtyByUnit(
      item.unitType as "KG" | "UNIDADE" | "CENTO",
      item.quantity
    );
    if (!result.ok) return sum;
    return sum + result.normalized * item.priceAtTime;
  }, 0);
  const total = subtotal + (Number(deliveryFee) || 0);

  const payload = JSON.stringify({
    customer: {
      mode: customerMode,
      customerId,
      name: customerName,
      phone: customerPhone || undefined,
    },
    deliveryDatetime,
    deliveryMethod,
    addressText: deliveryMethod === "ENTREGA" ? addressText : undefined,
    addressBairro: deliveryMethod === "ENTREGA" ? addressBairro : undefined,
    addressReferencia:
      deliveryMethod === "ENTREGA" ? addressReferencia : undefined,
    addressCity: deliveryMethod === "ENTREGA" ? addressCity : undefined,
    orderType,
    deliveryFee: Number(deliveryFee) || 0,
    items: items.map((item) => ({
      skuId: item.skuId,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime,
    })),
  });

  function addItem(sku: SkuOption) {
    setItems((prev) => [
      ...prev,
      {
        skuId: sku.id,
        skuLabel: sku.displayName,
        unitLabel: sku.unitLabel,
        unitType: sku.unitType,
        quantityStep: sku.quantityStep,
        minQty: sku.minQty,
        quantity: String(sku.minQty),
        priceAtTime: sku.priceCurrent,
      },
    ]);
  }

  function updateItem(index: number, quantity: string) {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const next = { ...item, quantity };
        const result = validateQtyByUnit(
          next.unitType as "KG" | "UNIDADE" | "CENTO",
          next.quantity
        );
        if (result.ok) {
          setQtyError("");
        }
        return next;
      })
    );
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  function validateItems() {
    for (const item of items) {
      const result = validateQtyByUnit(
        item.unitType as "KG" | "UNIDADE" | "CENTO",
        item.quantity
      );
      if (!result.ok) {
        return `${item.skuLabel}: ${result.error}`;
      }
    }
    return "";
  }

  return (
    <form
      action={createOrderAction}
      style={{ display: "grid", gap: 16 }}
      onSubmit={(event) => {
        const message = validateItems();
        if (message) {
          event.preventDefault();
          setQtyError(message);
        } else {
          setQtyError("");
        }
      }}
    >
      <input type="hidden" name="payload" value={payload} />

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Cliente</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <label>
            <input
              type="radio"
              checked={customerMode === "existing"}
              onChange={() => setCustomerMode("existing")}
            />{" "}
            Selecionar existente
          </label>
          <label>
            <input
              type="radio"
              checked={customerMode === "new"}
              onChange={() => setCustomerMode("new")}
            />{" "}
            Novo cliente
          </label>
        </div>
        {customerMode === "existing" ? (
          <select
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Selecione o cliente</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.phone ? `(${customer.phone})` : ""}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              required={customerMode === "new"}
            />
            <input
              type="text"
              placeholder="Telefone (opcional)"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Entrega</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Data e hora
            <input
              type="datetime-local"
              value={deliveryDatetime}
              onChange={(event) => setDeliveryDatetime(event.target.value)}
              required
            />
          </label>
          <label>
            Método
            <select
              value={deliveryMethod}
              onChange={(event) =>
                setDeliveryMethod(event.target.value as "ENTREGA" | "RETIRADA")
              }
            >
              <option value="ENTREGA">Entrega</option>
              <option value="RETIRADA">Retirada</option>
            </select>
          </label>
        </div>
        {deliveryMethod === "ENTREGA" ? (
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <input
              type="text"
              placeholder="Endereço"
              value={addressText}
              onChange={(event) => setAddressText(event.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Bairro"
              value={addressBairro}
              onChange={(event) => setAddressBairro(event.target.value)}
            />
            <input
              type="text"
              placeholder="Referência"
              value={addressReferencia}
              onChange={(event) => setAddressReferencia(event.target.value)}
            />
            <input
              type="text"
              placeholder="Cidade"
              value={addressCity}
              onChange={(event) => setAddressCity(event.target.value)}
            />
          </div>
        ) : null}
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Pedido</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Tipo
            <select
              value={orderType}
              onChange={(event) =>
                setOrderType(
                  event.target.value as "PRONTA_ENTREGA" | "ENCOMENDA"
                )
              }
            >
              <option value="PRONTA_ENTREGA">Pronta entrega</option>
              <option value="ENCOMENDA">Encomenda</option>
            </select>
          </label>
          <label>
            Taxa de entrega
            <input
              type="number"
              min="0"
              step="0.01"
              value={deliveryFee}
              onChange={(event) => setDeliveryFee(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Itens</h2>
        <input
          type="text"
          placeholder="Buscar SKU"
          value={skuSearch}
          onChange={(event) => setSkuSearch(event.target.value)}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            marginTop: 8,
          }}
        >
          <select
            onChange={(event) => {
              const sku = skus.find((s) => s.id === event.target.value);
              if (sku) {
                addItem(sku);
                setSkuSearch("");
                event.currentTarget.value = "";
              }
            }}
          >
            <option value="">Selecione um SKU</option>
            {filteredSkus.map((sku) => (
              <option key={sku.id} value={sku.id}>
                {sku.displayName} ({sku.unitLabel})
              </option>
            ))}
          </select>
        </div>

      {items.length === 0 ? (
        <p style={{ marginTop: 12 }}>Nenhum item adicionado.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {items.map((item, index) => (
              <div
                key={`${item.skuId}-${index}`}
                style={{
                  border: "1px solid #eee",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                <strong>{item.skuLabel}</strong>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 120px",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Qtd"
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(index, event.target.value)
                    }
                  />
                  <span>
                    {item.unitLabel} (passo {item.quantityStep})
                  </span>
                  <button type="button" onClick={() => removeItem(index)}>
                    Remover
                  </button>
                </div>
                <div style={{ marginTop: 6 }}>
                  {(() => {
                    const result = validateQtyByUnit(
                      item.unitType as "KG" | "UNIDADE" | "CENTO",
                      item.quantity
                    );
                    if (!result.ok) {
                      return "Quantidade invalida.";
                    }
                    const lineTotal = result.normalized * item.priceAtTime;
                    return (
                      <>
                        Preço: R$ {item.priceAtTime.toFixed(2)} | Total linha:
                        R$ {lineTotal.toFixed(2)}
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #ddd", padding: 12 }}>
        <h2>Totais</h2>
        <p>Subtotal: R$ {subtotal.toFixed(2)}</p>
        <p>Total: R$ {total.toFixed(2)}</p>
      </section>

      <button type="submit">Salvar pedido</button>
      {qtyError ? <p style={{ color: "crimson" }}>{qtyError}</p> : null}
    </form>
  );
}
