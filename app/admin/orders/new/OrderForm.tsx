"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createOrderAction } from "./actions";
import { validateQtyByUnit } from "@/lib/quantity";
import styles from "../../_styles/adminPrimitives.module.css";

type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
};

type CategoryOption = {
  id: string;
  name: string;
};

type SearchSkuOption = {
  skuId: string;
  skuLabel: string;
  productName: string;
  categoryName: string;
  unit: string;
  unitType: string;
  price: number;
  minQty: number;
  quantityStep: number;
};

type OrderItem = {
  lineId: string;
  skuId: string;
  skuLabel: string;
  productName: string;
  categoryName: string;
  unitLabel: string;
  unitType: string;
  quantityStep: number;
  minQty: number;
  quantity: string;
  priceAtTime: number;
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

function buildLocalDate(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }
  const date = new Date(year, month - 1, day, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCurrency(value: number) {
  return value.toFixed(2);
}

function parseFeeValue(value: string) {
  const raw = value.trim();
  if (!raw) {
    return { ok: false, error: "Informe a taxa de entrega (0 ou mais)." } as const;
  }
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: "Informe um valor numerico." } as const;
  }
  if (parsed < 0) {
    return { ok: false, error: "Informe uma taxa valida (0 ou mais)." } as const;
  }
  return { ok: true, value: parsed } as const;
}

function shouldDefaultDelivery(errorCode?: string) {
  return [
    "endereco-invalido",
    "cidade-invalida",
    "taxa-vazia",
    "taxa-invalida",
    "taxa-negativa",
  ].includes(errorCode || "");
}

export default function OrderForm({
  customers,
  errorCode,
}: {
  customers: CustomerOption[];
  errorCode?: string;
}) {
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    "existing"
  );
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<
    "ENTREGA" | "RETIRADA"
  >(shouldDefaultDelivery(errorCode) ? "ENTREGA" : "RETIRADA");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [addressText, setAddressText] = useState("");
  const [addressBairro, setAddressBairro] = useState("");
  const [addressReferencia, setAddressReferencia] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [notes, setNotes] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [skuQuery, setSkuQuery] = useState("");
  const [skuResults, setSkuResults] = useState<SearchSkuOption[]>([]);
  const [skuOpen, setSkuOpen] = useState(false);
  const [skuActiveIndex, setSkuActiveIndex] = useState(-1);
  const [skuStatus, setSkuStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );

  const [items, setItems] = useState<OrderItem[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState("");

  const lineIdRef = useRef(0);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const lastAddedRef = useRef<string | null>(null);

  const skuInputRef = useRef<HTMLInputElement | null>(null);
  const deliveryMethodRef = useRef<HTMLInputElement | null>(null);
  const customerSelectRef = useRef<HTMLSelectElement | null>(null);
  const customerNameRef = useRef<HTMLInputElement | null>(null);
  const scheduleDateRef = useRef<HTMLInputElement | null>(null);
  const scheduleTimeRef = useRef<HTMLSelectElement | null>(null);
  const addressTextRef = useRef<HTMLInputElement | null>(null);
  const addressCityRef = useRef<HTMLInputElement | null>(null);
  const deliveryFeeRef = useRef<HTMLInputElement | null>(null);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter((customer) => {
      const nameMatch = customer.name.toLowerCase().includes(query);
      const phoneMatch = customer.phone
        ? customer.phone.toLowerCase().includes(query)
        : false;
      return nameMatch || phoneMatch;
    });
  }, [customers, customerSearch]);

  const itemsWithTotals = useMemo(() => {
    return items.map((item) => {
      const result = validateQtyByUnit(
        item.unitType as "KG" | "UNIDADE" | "CENTO",
        item.quantity
      );
      const normalized = result.ok ? result.normalized : 0;
      return {
        ...item,
        qtyResult: result,
        lineTotal: normalized * item.priceAtTime,
      };
    });
  }, [items]);

  const subtotal = itemsWithTotals.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  const feeValue =
    deliveryMethod === "ENTREGA"
      ? parseFeeValue(deliveryFee)
      : ({ ok: true, value: 0 } as const);
  const total = subtotal + (feeValue.ok ? feeValue.value : 0);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");
        if (!response.ok) return;
        const data = (await response.json()) as { items?: CategoryOption[] };
        if (!active) return;
        setCategories(data.items ?? []);
      } catch {
        if (!active) return;
        setCategories([]);
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!skuQuery.trim() && !categoryId) {
      setSkuResults([]);
      setSkuOpen(false);
      setSkuActiveIndex(-1);
      setSkuStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setSkuStatus("loading");
      try {
        const params = new URLSearchParams();
        if (skuQuery.trim()) params.set("q", skuQuery.trim());
        if (categoryId) params.set("categoryId", categoryId);
        params.set("limit", "10");

        const response = await fetch(
          `/api/products/search?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("request-failed");
        }
        const data = (await response.json()) as {
          items?: SearchSkuOption[];
        };
        if (controller.signal.aborted) return;
        const nextResults = data.items ?? [];
        setSkuResults(nextResults);
        setSkuOpen(true);
        setSkuActiveIndex(nextResults.length > 0 ? 0 : -1);
        setSkuStatus("idle");
      } catch {
        if (controller.signal.aborted) return;
        setSkuStatus("error");
        setSkuResults([]);
        setSkuOpen(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [skuQuery, categoryId]);

  useEffect(() => {
    if (!lastAddedRef.current) return;
    const lineId = lastAddedRef.current;
    const input = qtyRefs.current[lineId];
    if (input) {
      input.focus();
      input.select();
    }
    lastAddedRef.current = null;
  }, [items]);

  useEffect(() => {
    if (!errorCode) return;
    setSubmitAttempted(true);
    const focusMap: Record<string, () => void> = {
      "cliente-invalido": () => customerSelectRef.current?.focus(),
      "data-invalida": () => scheduleDateRef.current?.focus(),
      "hora-invalida": () => scheduleTimeRef.current?.focus(),
      "data-passada": () => scheduleTimeRef.current?.focus(),
      "endereco-invalido": () => addressTextRef.current?.focus(),
      "cidade-invalida": () => addressCityRef.current?.focus(),
      "taxa-vazia": () => deliveryFeeRef.current?.focus(),
      "taxa-negativa": () => deliveryFeeRef.current?.focus(),
      "taxa-invalida": () => deliveryFeeRef.current?.focus(),
      "sem-itens": () => skuInputRef.current?.focus(),
    };
    const focus = focusMap[errorCode];
    if (focus) {
      setTimeout(() => focus(), 0);
    }
  }, [errorCode]);

  function addItem(option: SearchSkuOption) {
    const lineId = `line-${Date.now()}-${lineIdRef.current++}`;
    const quantity = String(option.minQty || 1);
    const nextItem: OrderItem = {
      lineId,
      skuId: option.skuId,
      skuLabel: option.skuLabel,
      productName: option.productName,
      categoryName: option.categoryName,
      unitLabel: option.unit,
      unitType: option.unitType,
      quantityStep: option.quantityStep,
      minQty: option.minQty,
      quantity,
      priceAtTime: option.price,
    };

    setItems((prev) => [...prev, nextItem]);
    lastAddedRef.current = lineId;
  }

  function updateItemQuantity(lineId: string, value: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.lineId === lineId ? { ...item, quantity: value } : item
      )
    );
  }

  function removeItem(lineId: string) {
    setItems((prev) => prev.filter((item) => item.lineId !== lineId));
  }

  function getItemError(item: OrderItem) {
    const result = validateQtyByUnit(
      item.unitType as "KG" | "UNIDADE" | "CENTO",
      item.quantity
    );
    if (!result.ok) {
      if (result.error === "Quantidade invalida.") {
        return "Informe uma quantidade maior que zero.";
      }
      return result.error;
    }
    return "";
  }

  function validateForm() {
    const errors: Record<string, string> = {};
    const itemErrors: Record<string, string> = {};

    if (customerMode === "existing") {
      if (!customerId) {
        errors.customerId = "Selecione um cliente.";
      }
    } else {
      if (!customerName.trim()) {
        errors.customerName = "Informe um cliente valido.";
      }
    }

    if (!scheduleDate) {
      errors.scheduleDate = "Informe a data.";
    }

    if (!scheduleTime) {
      errors.scheduleTime = "Informe o horario.";
    }

    if (scheduleDate && scheduleTime) {
      const schedule = buildLocalDate(scheduleDate, scheduleTime);
      if (!schedule || schedule.getTime() <= Date.now()) {
        errors.scheduleTime = "Selecione uma data e horario no futuro.";
      }
    }

    if (deliveryMethod === "ENTREGA") {
      if (!addressText.trim()) {
        errors.addressText = "Informe o endereco.";
      }
      if (!addressCity.trim()) {
        errors.addressCity = "Informe a cidade.";
      }
      const feeCheck = parseFeeValue(deliveryFee);
      if (!feeCheck.ok) {
        errors.deliveryFee = feeCheck.error;
      }
    }

    if (items.length === 0) {
      errors.items = "Adicione pelo menos 1 item ao pedido.";
    }

    for (const item of items) {
      const error = getItemError(item);
      if (error) {
        itemErrors[item.lineId] = error;
      }
    }

    return {
      errors,
      itemErrors,
      isValid:
        Object.keys(errors).length === 0 &&
        Object.keys(itemErrors).length === 0,
    };
  }

  const validation = validateForm();

  const payload = JSON.stringify({
    customer: {
      mode: customerMode,
      customerId,
      name: customerName,
      phone: customerPhone || undefined,
    },
    scheduleDate,
    scheduleTime,
    deliveryMethod,
    addressText: deliveryMethod === "ENTREGA" ? addressText : undefined,
    addressBairro: deliveryMethod === "ENTREGA" ? addressBairro : undefined,
    addressReferencia:
      deliveryMethod === "ENTREGA" ? addressReferencia : undefined,
    addressCity: deliveryMethod === "ENTREGA" ? addressCity : undefined,
    orderType: "PRONTA_ENTREGA",
    deliveryFee: deliveryMethod === "ENTREGA" ? deliveryFee : undefined,
    notes,
    items: items.map((item) => ({
      skuId: item.skuId,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime,
    })),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (validation.isValid) {
      setFormError("");
      return;
    }

    event.preventDefault();
    setSubmitAttempted(true);
    setFormError("Revise os campos destacados.");

    if (validation.errors.customerId) {
      customerSelectRef.current?.focus();
      return;
    }
    if (validation.errors.customerName) {
      customerNameRef.current?.focus();
      return;
    }
    if (validation.errors.scheduleDate) {
      scheduleDateRef.current?.focus();
      return;
    }
    if (validation.errors.scheduleTime) {
      scheduleTimeRef.current?.focus();
      return;
    }
    if (validation.errors.addressText) {
      addressTextRef.current?.focus();
      return;
    }
    if (validation.errors.addressCity) {
      addressCityRef.current?.focus();
      return;
    }
    if (validation.errors.deliveryFee) {
      deliveryFeeRef.current?.focus();
      return;
    }
    if (validation.errors.items) {
      skuInputRef.current?.focus();
      return;
    }

    const firstItemError = Object.keys(validation.itemErrors)[0];
    if (firstItemError) {
      qtyRefs.current[firstItemError]?.focus();
    }
  }

  const showErrors = submitAttempted;

  return (
    <form
      action={createOrderAction}
      className={styles.stackMd}
      onSubmit={handleSubmit}
      noValidate
    >
      <input type="hidden" name="payload" value={payload} />

      {formError ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          {formError}
        </div>
      ) : null}
      <div className={styles.pageGrid}>
        <div className={styles.pageMain}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Cliente</h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.clusterSm}>
                <label className={styles.choiceRow}>
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === "existing"}
                    onChange={() => {
                      setCustomerMode("existing");
                      setCustomerName("");
                    }}
                  />
                  <span className={styles.choiceLabel}>
                    Selecionar cliente existente
                  </span>
                </label>
                <label className={styles.choiceRow}>
                  <input
                    type="radio"
                    name="customerMode"
                    checked={customerMode === "new"}
                    onChange={() => {
                      setCustomerMode("new");
                      setCustomerId("");
                    }}
                  />
                  <span className={styles.choiceLabel}>
                    Cadastrar novo cliente
                  </span>
                </label>
              </div>
              {customerMode === "existing" ? (
                <div className={styles.stackSm}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Buscar cliente</span>
                    <input
                      type="text"
                      placeholder="Buscar por nome ou telefone"
                      value={customerSearch}
                      onChange={(event) =>
                        setCustomerSearch(event.target.value)
                      }
                      className={styles.control}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Cliente</span>
                    <select
                      ref={customerSelectRef}
                      value={customerId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setCustomerId(value);
                        setCustomerSearch("");
                        if (value) {
                          setTimeout(
                            () => deliveryMethodRef.current?.focus(),
                            0
                          );
                        }
                      }}
                      aria-invalid={
                        showErrors && Boolean(validation.errors.customerId)
                      }
                      aria-describedby={
                        showErrors && validation.errors.customerId
                          ? "customer-error"
                          : undefined
                      }
                      className={styles.control}
                    >
                      <option value="">Selecione um cliente</option>
                      {filteredCustomers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.phone ? ` (${customer.phone})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  {showErrors && validation.errors.customerId ? (
                    <div id="customer-error" className={styles.fieldError}>
                      {validation.errors.customerId}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Nome</span>
                    <input
                      ref={customerNameRef}
                      type="text"
                      placeholder="Nome do cliente"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      aria-invalid={
                        showErrors && Boolean(validation.errors.customerName)
                      }
                      aria-describedby={
                        showErrors && validation.errors.customerName
                          ? "customer-name-error"
                          : undefined
                      }
                      className={styles.control}
                    />
                    {showErrors && validation.errors.customerName ? (
                      <span
                        id="customer-name-error"
                        className={styles.fieldError}
                      >
                        {validation.errors.customerName}
                      </span>
                    ) : null}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Telefone (opcional)</span>
                    <input
                      type="text"
                      placeholder="Telefone"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      className={styles.control}
                    />
                  </label>
                </div>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Entrega</h2>
            </div>
            <div className={styles.panelBody}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Entrega ou retirada?</span>
                <div
                  className={styles.segmented}
                  role="radiogroup"
                  aria-label="Metodo"
                >
                  <label
                    className={`${styles.segmentedOption} ${
                      deliveryMethod === "RETIRADA" ? styles.segmentedActive : ""
                    }`}
                  >
                    <input
                      ref={deliveryMethodRef}
                      type="radio"
                      name="deliveryMethod"
                      value="RETIRADA"
                      checked={deliveryMethod === "RETIRADA"}
                      onChange={() => setDeliveryMethod("RETIRADA")}
                    />
                    <span className={styles.segmentedTitle}>Retirada</span>
                    <span className={styles.segmentedHelp}>
                      Sem endereco e sem taxa.
                    </span>
                  </label>
                  <label
                    className={`${styles.segmentedOption} ${
                      deliveryMethod === "ENTREGA" ? styles.segmentedActive : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryMethod"
                      value="ENTREGA"
                      checked={deliveryMethod === "ENTREGA"}
                      onChange={() => setDeliveryMethod("ENTREGA")}
                    />
                    <span className={styles.segmentedTitle}>Entrega</span>
                    <span className={styles.segmentedHelp}>
                      Informe endereco e taxa de entrega.
                    </span>
                  </label>
                </div>
              </label>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Data</span>
                  <input
                    ref={scheduleDateRef}
                    type="date"
                    value={scheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    aria-invalid={
                      showErrors && Boolean(validation.errors.scheduleDate)
                    }
                    aria-describedby={
                      showErrors && validation.errors.scheduleDate
                        ? "schedule-date-error"
                        : undefined
                    }
                    className={styles.control}
                  />
                  {showErrors && validation.errors.scheduleDate ? (
                    <span
                      id="schedule-date-error"
                      className={styles.fieldError}
                    >
                      {validation.errors.scheduleDate}
                    </span>
                  ) : null}
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Horario</span>
                  <select
                    ref={scheduleTimeRef}
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                    disabled={!scheduleDate}
                    aria-invalid={
                      showErrors && Boolean(validation.errors.scheduleTime)
                    }
                    aria-describedby={
                      showErrors && validation.errors.scheduleTime
                        ? "schedule-time-error"
                        : undefined
                    }
                    className={styles.control}
                  >
                    <option value="">Selecione o horario</option>
                    {TIME_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <span className={styles.fieldHelp}>
                    Horarios disponiveis de 30 em 30 minutos.
                  </span>
                  {showErrors && validation.errors.scheduleTime ? (
                    <span
                      id="schedule-time-error"
                      className={styles.fieldError}
                    >
                      {validation.errors.scheduleTime}
                    </span>
                  ) : null}
                </label>
              </div>

              {deliveryMethod === "ENTREGA" ? (
                <div className={styles.formGrid}>
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={styles.fieldLabel}>Endereco</span>
                    <input
                      ref={addressTextRef}
                      type="text"
                      value={addressText}
                      onChange={(event) => setAddressText(event.target.value)}
                      aria-invalid={
                        showErrors && Boolean(validation.errors.addressText)
                      }
                      aria-describedby={
                        showErrors && validation.errors.addressText
                          ? "address-error"
                          : undefined
                      }
                      className={styles.control}
                    />
                    {showErrors && validation.errors.addressText ? (
                      <span id="address-error" className={styles.fieldError}>
                        {validation.errors.addressText}
                      </span>
                    ) : null}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Cidade</span>
                    <input
                      ref={addressCityRef}
                      type="text"
                      value={addressCity}
                      onChange={(event) => setAddressCity(event.target.value)}
                      aria-invalid={
                        showErrors && Boolean(validation.errors.addressCity)
                      }
                      aria-describedby={
                        showErrors && validation.errors.addressCity
                          ? "city-error"
                          : undefined
                      }
                      className={styles.control}
                    />
                    {showErrors && validation.errors.addressCity ? (
                      <span id="city-error" className={styles.fieldError}>
                        {validation.errors.addressCity}
                      </span>
                    ) : null}
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Bairro</span>
                    <input
                      type="text"
                      value={addressBairro}
                      onChange={(event) => setAddressBairro(event.target.value)}
                      className={styles.control}
                    />
                  </label>
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={styles.fieldLabel}>Referencia</span>
                    <input
                      type="text"
                      value={addressReferencia}
                      onChange={(event) =>
                        setAddressReferencia(event.target.value)
                      }
                      className={styles.control}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Taxa de entrega</span>
                    <input
                      ref={deliveryFeeRef}
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={deliveryFee}
                      onChange={(event) => setDeliveryFee(event.target.value)}
                      aria-invalid={
                        showErrors && Boolean(validation.errors.deliveryFee)
                      }
                      aria-describedby={
                        showErrors && validation.errors.deliveryFee
                          ? "fee-error"
                          : undefined
                      }
                      className={styles.control}
                    />
                    <span className={styles.fieldHelp}>
                      Use 0 se nao houver cobranca.
                    </span>
                    {showErrors && validation.errors.deliveryFee ? (
                      <span id="fee-error" className={styles.fieldError}>
                        {validation.errors.deliveryFee}
                      </span>
                    ) : null}
                  </label>
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Itens</h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.toolbar}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Buscar produto</span>
                  <div className={styles.autocomplete}>
                    <input
                      ref={skuInputRef}
                      type="text"
                      placeholder="Digite o nome do produto..."
                      value={skuQuery}
                      onChange={(event) => {
                        setSkuQuery(event.target.value);
                        setSkuOpen(true);
                      }}
                      onFocus={() => {
                        if (skuResults.length > 0) setSkuOpen(true);
                      }}
                      onBlur={() => {
                        setTimeout(() => setSkuOpen(false), 150);
                      }}
                      onKeyDown={(event) => {
                        if (!skuOpen || skuResults.length === 0) return;
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setSkuActiveIndex((prev) =>
                            Math.min(prev + 1, skuResults.length - 1)
                          );
                        }
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setSkuActiveIndex((prev) => Math.max(prev - 1, 0));
                        }
                        if (event.key === "Enter") {
                          event.preventDefault();
                          const option = skuResults[skuActiveIndex];
                          if (option) {
                            addItem(option);
                            setSkuQuery("");
                            setSkuResults([]);
                            setSkuOpen(false);
                            setSkuActiveIndex(-1);
                          }
                        }
                        if (event.key === "Escape") {
                          setSkuOpen(false);
                        }
                      }}
                      role="combobox"
                      aria-expanded={skuOpen}
                      aria-controls="sku-listbox"
                      aria-autocomplete="list"
                      className={styles.control}
                    />
                    {skuOpen ? (
                      <ul
                        className={styles.autocompleteList}
                        role="listbox"
                        id="sku-listbox"
                      >
                        {skuStatus === "loading" ? (
                          <li className={styles.autocompleteEmpty}>
                            Buscando...
                          </li>
                        ) : null}
                        {skuStatus === "error" ? (
                          <li className={styles.autocompleteEmpty}>
                            Nao foi possivel carregar.
                          </li>
                        ) : null}
                        {skuStatus === "idle" && skuResults.length === 0 ? (
                          <li className={styles.autocompleteEmpty}>
                            Nenhum produto encontrado.
                          </li>
                        ) : null}
                        {skuResults.map((option, index) => (
                          <li
                            key={`${option.skuId}-${index}`}
                            role="option"
                            aria-selected={index === skuActiveIndex}
                            className={`${styles.autocompleteOption} ${
                              index === skuActiveIndex
                                ? styles.autocompleteOptionActive
                                : ""
                            }`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              addItem(option);
                              setSkuQuery("");
                              setSkuResults([]);
                              setSkuOpen(false);
                              setSkuActiveIndex(-1);
                            }}
                          >
                            <div className={styles.autocompleteMain}>
                              <strong>{option.productName}</strong>
                              <span className={styles.textMuted}>
                                {option.categoryName}
                              </span>
                            </div>
                            <div className={styles.autocompleteMeta}>
                              {option.skuLabel ? `${option.skuLabel} · ` : ""}
                              {option.unit} · R$ {formatCurrency(option.price)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Categoria</span>
                  <div className={styles.clusterSm}>
                    <select
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                      className={styles.control}
                    >
                      <option value="">Todas</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {categoryId ? (
                      <button
                        type="button"
                        onClick={() => setCategoryId("")}
                        className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                </label>
              </div>

              {showErrors && validation.errors.items ? (
                <div className={styles.fieldError}>{validation.errors.items}</div>
              ) : null}

              {items.length === 0 ? (
                <div className={styles.emptyState}>
                  <div>Nenhum item adicionado.</div>
                  <div className={styles.textMuted}>
                    Busque um produto pelo nome acima.
                  </div>
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Produto</th>
                        <th>Quantidade</th>
                        <th>Unidade</th>
                        <th className={styles.tableNumeric}>Preco unitario</th>
                        <th className={styles.tableNumeric}>Total</th>
                        <th className={styles.tableActions}>Acao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsWithTotals.map((item) => {
                        const itemError = validation.itemErrors[item.lineId];
                        return (
                          <tr key={item.lineId}>
                            <td>
                              <div>
                                <strong>{item.productName}</strong>
                              </div>
                              <div className={styles.textMuted}>
                                {item.categoryName}
                                {item.skuLabel ? ` · ${item.skuLabel}` : ""}
                              </div>
                            </td>
                            <td>
                              <input
                                ref={(el) => {
                                  qtyRefs.current[item.lineId] = el;
                                }}
                                type="text"
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(event) =>
                                  updateItemQuantity(
                                    item.lineId,
                                    event.target.value
                                  )
                                }
                                aria-invalid={showErrors && Boolean(itemError)}
                                aria-describedby={
                                  showErrors && itemError
                                    ? `qty-error-${item.lineId}`
                                    : undefined
                                }
                                className={styles.control}
                              />
                              {showErrors && itemError ? (
                                <div
                                  id={`qty-error-${item.lineId}`}
                                  className={styles.fieldError}
                                >
                                  {itemError}
                                </div>
                              ) : null}
                            </td>
                            <td>{item.unitLabel}</td>
                            <td className={styles.tableNumeric}>
                              R$ {formatCurrency(item.priceAtTime)}
                            </td>
                            <td className={styles.tableNumeric}>
                              R$ {formatCurrency(item.lineTotal)}
                            </td>
                            <td className={styles.tableActions}>
                              <button
                                type="button"
                                onClick={() => removeItem(item.lineId)}
                                className={`${styles.button} ${styles.buttonDanger} ${styles.buttonSm}`}
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Observacoes</h2>
            </div>
            <div className={styles.panelBody}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Observacoes</span>
                <textarea
                  rows={3}
                  placeholder="Ex.: sem cebola, entregar na portaria..."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={`${styles.control} ${styles.controlTextarea}`}
                />
              </label>
            </div>
          </section>
        </div>

        <aside className={styles.pageAside}>
          <section className={`${styles.panel} ${styles.stickyPanel}`}>
            <div className={styles.panelHeader}>
              <h2>Resumo</h2>
            </div>
            <div className={styles.panelBody}>
              {items.length === 0 ? (
                <div className={styles.textMuted}>
                  Adicione itens para calcular o total.
                </div>
              ) : (
                <div className={styles.stackSm}>
                  <div className={styles.summaryRow}>
                    <span>Subtotal</span>
                    <strong>R$ {formatCurrency(subtotal)}</strong>
                  </div>
                  {deliveryMethod === "ENTREGA" ? (
                    <div className={styles.summaryRow}>
                      <span>Taxa de entrega</span>
                      <strong>
                        R$ {feeValue.ok ? formatCurrency(feeValue.value) : "--"}
                      </strong>
                    </div>
                  ) : null}
                  <div className={styles.summaryRow}>
                    <span>Total</span>
                    <strong>R$ {formatCurrency(total)}</strong>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.panelFooter}>
              <button
                type="submit"
                disabled={!validation.isValid}
                className={`${styles.button} ${styles.buttonPrimary}`}
              >
                Salvar pedido
              </button>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
