"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createOrderAction } from "./actions";
import { normalizePhoneBR, normalizePhoneDigits } from "@/lib/phone";
import { validateSkuQuantity } from "@/lib/quantity";
import type { OrderStatus } from "@prisma/client";
import styles from "../../_styles/adminPrimitives.module.css";

const DRAFT_KEY = "order-new-draft-v1";

type CustomerOption = {
  id: string;
  name: string;
  phone: string;
};

type ExistingCustomerHint = {
  id: string;
  name: string;
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

type OrderDraft = {
  customerMode: "existing" | "new";
  customerId: string;
  customerSearch: string;
  customerName: string;
  customerPhone: string;
  deliveryMethod: "ENTREGA" | "RETIRADA";
  orderType: "ENCOMENDA" | "PRONTA_ENTREGA";
  saveAddressAsDefault: boolean;
  scheduleDate: string;
  scheduleTime: string;
  addressText: string;
  addressBairro: string;
  addressReferencia: string;
  addressCity: string;
  addressCep: string;
  deliveryFee: string;
  paymentMethod: string;
  hasDeposit: boolean;
  depositAmount: string;
  notes: string;
  categoryId: string;
  items: OrderItem[];
};

export type OrderFormMode = "new" | "edit";

export type OrderFormInitialData = Partial<OrderDraft> & {
  orderId?: string;
  orderStatus?: OrderStatus;
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

function formatPhoneDisplay(value: string) {
  const digits = normalizePhoneDigits(value);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function formatCustomerLabel(customer: CustomerOption) {
  if (customer.phone) {
    return `${customer.name} (${formatPhoneDisplay(customer.phone)})`;
  }
  return customer.name;
}

function parseFeeValue(value: string) {
  const raw = value.trim();
  if (!raw) {
    return { ok: true, value: 0 } as const;
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

function parseDepositValue(value: string) {
  const raw = value.trim();
  if (!raw) {
    return { ok: false, error: "Informe o valor do sinal." } as const;
  }
  const parsed = Number(raw.replace(",", "."));
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: "Informe um valor numerico." } as const;
  }
  if (parsed <= 0) {
    return { ok: false, error: "Informe um valor de sinal valido." } as const;
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

function normalizeItem(item: unknown, index: number): OrderItem | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const skuId = typeof record.skuId === "string" ? record.skuId : "";
  if (!skuId) return null;
  const quantity =
    typeof record.quantity === "string" || typeof record.quantity === "number"
      ? String(record.quantity)
      : "1";
  const toNumber = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    lineId:
      typeof record.lineId === "string"
        ? record.lineId
        : `line-${Date.now()}-${index}`,
    skuId,
    skuLabel: typeof record.skuLabel === "string" ? record.skuLabel : "",
    productName:
      typeof record.productName === "string" ? record.productName : "",
    categoryName:
      typeof record.categoryName === "string" ? record.categoryName : "",
    unitLabel: typeof record.unitLabel === "string" ? record.unitLabel : "",
    unitType: typeof record.unitType === "string" ? record.unitType : "UNIDADE",
    quantityStep: toNumber(record.quantityStep, 1),
    minQty: toNumber(record.minQty, 1),
    quantity,
    priceAtTime: toNumber(record.priceAtTime, 0),
  };
}

function parseDraft(raw: string | null): OrderDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OrderDraft>;
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((item, index) => normalizeItem(item, index))
          .filter((item): item is OrderItem => Boolean(item))
      : [];
    const customerMode =
      parsed.customerMode === "new" ? "new" : "existing";
    const orderType =
      parsed.orderType === "ENCOMENDA" ? "ENCOMENDA" : "PRONTA_ENTREGA";
    const deliveryMethod =
      parsed.deliveryMethod === "ENTREGA" ? "ENTREGA" : "RETIRADA";
    const saveAddressAsDefault = parsed.saveAddressAsDefault === true;
    return {
      customerMode,
      customerId: typeof parsed.customerId === "string" ? parsed.customerId : "",
      customerSearch:
        typeof parsed.customerSearch === "string" ? parsed.customerSearch : "",
      customerName:
        typeof parsed.customerName === "string" ? parsed.customerName : "",
      customerPhone:
        typeof parsed.customerPhone === "string" ? parsed.customerPhone : "",
      deliveryMethod,
      orderType,
      saveAddressAsDefault,
      scheduleDate:
        typeof parsed.scheduleDate === "string" ? parsed.scheduleDate : "",
      scheduleTime:
        typeof parsed.scheduleTime === "string" ? parsed.scheduleTime : "",
      addressText:
        typeof parsed.addressText === "string" ? parsed.addressText : "",
      addressBairro:
        typeof parsed.addressBairro === "string" ? parsed.addressBairro : "",
      addressReferencia:
        typeof parsed.addressReferencia === "string"
          ? parsed.addressReferencia
          : "",
      addressCity:
        typeof parsed.addressCity === "string" ? parsed.addressCity : "",
      addressCep: typeof parsed.addressCep === "string" ? parsed.addressCep : "",
      deliveryFee:
        typeof parsed.deliveryFee === "string" ? parsed.deliveryFee : "",
      paymentMethod:
        typeof parsed.paymentMethod === "string" ? parsed.paymentMethod : "",
      hasDeposit: parsed.hasDeposit === true,
      depositAmount:
        typeof parsed.depositAmount === "string" ? parsed.depositAmount : "",
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
      categoryId:
        typeof parsed.categoryId === "string" ? parsed.categoryId : "",
      items,
    };
  } catch {
    return null;
  }
}

export default function OrderForm({
  customers,
  errorCode,
  existingCustomer,
  mode = "new",
  initialData,
  action,
}: {
  customers: CustomerOption[];
  errorCode?: string;
  existingCustomer?: ExistingCustomerHint;
  mode?: OrderFormMode;
  initialData?: OrderFormInitialData;
  action?: (formData: FormData) => void | Promise<void>;
}) {
  const isEdit = mode === "edit";
  const initial = initialData ?? {};
  const orderId = initial.orderId ?? "";
  const orderStatus = initial.orderStatus;
  const isFinalOrder =
    isEdit && (orderStatus === "ENTREGUE" || orderStatus === "CANCELADO");

  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    initial.customerMode ?? "existing"
  );
  const [customerId, setCustomerId] = useState(initial.customerId ?? "");
  const [customerSearch, setCustomerSearch] = useState(
    initial.customerSearch ?? ""
  );
  const [customerName, setCustomerName] = useState(
    initial.customerName ?? ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    initial.customerPhone ?? ""
  );
  const [deliveryMethod, setDeliveryMethod] = useState<
    "ENTREGA" | "RETIRADA"
  >(
    initial.deliveryMethod ??
      (shouldDefaultDelivery(errorCode) ? "ENTREGA" : "RETIRADA")
  );
  const [orderType, setOrderType] = useState<"ENCOMENDA" | "PRONTA_ENTREGA">(
    initial.orderType ?? "PRONTA_ENTREGA"
  );
  const [saveAddressAsDefault, setSaveAddressAsDefault] = useState(
    initial.saveAddressAsDefault ?? false
  );
  const [addressAutofillHint, setAddressAutofillHint] = useState("");
  const [scheduleDate, setScheduleDate] = useState(initial.scheduleDate ?? "");
  const [scheduleTime, setScheduleTime] = useState(initial.scheduleTime ?? "");
  const [addressText, setAddressText] = useState(initial.addressText ?? "");
  const [addressBairro, setAddressBairro] = useState(
    initial.addressBairro ?? ""
  );
  const [addressReferencia, setAddressReferencia] = useState(
    initial.addressReferencia ?? ""
  );
  const [addressCity, setAddressCity] = useState(initial.addressCity ?? "");
  const [addressCep, setAddressCep] = useState(initial.addressCep ?? "");
  const [deliveryFee, setDeliveryFee] = useState(initial.deliveryFee ?? "");
  const [paymentMethod, setPaymentMethod] = useState(
    initial.paymentMethod ?? ""
  );
  const [hasDeposit, setHasDeposit] = useState(initial.hasDeposit ?? false);
  const [depositAmount, setDepositAmount] = useState(
    initial.depositAmount ?? ""
  );
  const [notes, setNotes] = useState(initial.notes ?? "");

  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [skuQuery, setSkuQuery] = useState("");
  const [skuResults, setSkuResults] = useState<SearchSkuOption[]>([]);
  const [skuOpen, setSkuOpen] = useState(false);
  const [skuActiveIndex, setSkuActiveIndex] = useState(-1);
  const [skuStatus, setSkuStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );

  const [customerOpen, setCustomerOpen] = useState(false);
  const [customerActiveIndex, setCustomerActiveIndex] = useState(-1);

  const [items, setItems] = useState<OrderItem[]>(initial.items ?? []);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState("");
  const [availabilityWarning, setAvailabilityWarning] = useState(false);
  const [availabilityWarningMode, setAvailabilityWarningMode] = useState<
    "unavailable" | "out_of_stock"
  >("unavailable");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const availabilityBypassRef = useRef(false);
  const reconfirmBypassRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const availabilityBypassInputRef = useRef<HTMLInputElement | null>(null);

  const [finalEditConfirmed, setFinalEditConfirmed] = useState(false);
  const [finalEditReason, setFinalEditReason] = useState("");

  const lineIdRef = useRef(0);
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const lastAddedRef = useRef<string | null>(null);
  const lastAutofillRef = useRef<string | null>(null);

  const skuInputRef = useRef<HTMLInputElement | null>(null);
  const deliveryMethodRef = useRef<HTMLInputElement | null>(null);
  const customerSearchRef = useRef<HTMLInputElement | null>(null);
  const customerNameRef = useRef<HTMLInputElement | null>(null);
  const customerPhoneRef = useRef<HTMLInputElement | null>(null);
  const scheduleDateRef = useRef<HTMLInputElement | null>(null);
  const scheduleTimeRef = useRef<HTMLSelectElement | null>(null);
  const addressTextRef = useRef<HTMLInputElement | null>(null);
  const addressCityRef = useRef<HTMLInputElement | null>(null);
  const deliveryFeeRef = useRef<HTMLInputElement | null>(null);
  const paymentMethodRef = useRef<HTMLSelectElement | null>(null);
  const depositAmountRef = useRef<HTMLInputElement | null>(null);
  const finalEditReasonRef = useRef<HTMLTextAreaElement | null>(null);

  const filteredCustomers = useMemo(() => {
    const trimmed = customerSearch.trim();
    if (!trimmed) return customers.slice(0, 12);
    const query = trimmed.toLowerCase();
    const queryDigits = normalizePhoneDigits(trimmed);
    return customers
      .filter((customer) => {
        const nameMatch = customer.name.toLowerCase().includes(query);
        const phoneMatch = queryDigits
          ? normalizePhoneDigits(customer.phone ?? "").includes(queryDigits)
          : false;
        return nameMatch || phoneMatch;
      })
      .slice(0, 12);
  }, [customers, customerSearch]);

  const existingCustomerOption = useMemo(() => {
    if (!existingCustomer?.id) return null;
    return customers.find((customer) => customer.id === existingCustomer.id) ?? null;
  }, [customers, existingCustomer]);

  const itemsWithTotals = useMemo(() => {
    return items.map((item) => {
      const result = validateSkuQuantity(
        {
          unitType: item.unitType as "KG" | "UNIDADE" | "CENTO",
          minQty: item.minQty,
          quantityStep: item.quantityStep,
        },
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

  type CompareSnapshot = {
    orderType: OrderDraft["orderType"];
    deliveryMethod: OrderDraft["deliveryMethod"];
    scheduleDate: string;
    scheduleTime: string;
    addressText: string;
    addressBairro: string;
    addressReferencia: string;
    addressCity: string;
    addressCep: string;
    deliveryFee: number;
    subtotal: number;
    total: number;
    items: Array<{ skuId: string; quantity: number }>;
  };

  const initialSnapshotRef = useRef<CompareSnapshot | null>(null);

  function normalizeCompareItems(list: OrderItem[]) {
    return list
      .map((item) => ({
        skuId: item.skuId,
        quantity: Number(item.quantity) || 0,
      }))
      .sort((a, b) => a.skuId.localeCompare(b.skuId));
  }

  function normalizeText(value: string) {
    return value.trim();
  }

  function buildSnapshot(sourceItems: OrderItem[], source: Partial<OrderDraft>) {
    const deliveryFeeValue = Number(source.deliveryFee ?? 0) || 0;
    const itemsWithPrices = sourceItems.map((item) => ({
      quantity: Number(item.quantity) || 0,
      priceAtTime: Number(item.priceAtTime) || 0,
    }));
    const subtotalValue = itemsWithPrices.reduce(
      (sum, item) => sum + item.quantity * item.priceAtTime,
      0
    );
    const totalValue =
      subtotalValue + (source.deliveryMethod === "ENTREGA" ? deliveryFeeValue : 0);
    return {
      orderType: source.orderType ?? "PRONTA_ENTREGA",
      deliveryMethod: source.deliveryMethod ?? "RETIRADA",
      scheduleDate: source.scheduleDate ?? "",
      scheduleTime: source.scheduleTime ?? "",
      addressText: source.addressText ?? "",
      addressBairro: source.addressBairro ?? "",
      addressReferencia: source.addressReferencia ?? "",
      addressCity: source.addressCity ?? "",
      addressCep: source.addressCep ?? "",
      deliveryFee: deliveryFeeValue,
      subtotal: subtotalValue,
      total: totalValue,
      items: normalizeCompareItems(sourceItems),
    } satisfies CompareSnapshot;
  }

  if (!initialSnapshotRef.current) {
    initialSnapshotRef.current = buildSnapshot(initial.items ?? [], initial);
  }

  const currentSnapshot = buildSnapshot(items, {
    orderType,
    deliveryMethod,
    scheduleDate,
    scheduleTime,
    addressText,
    addressBairro,
    addressReferencia,
    addressCity,
    addressCep,
    deliveryFee,
  });

  const requiresReconfirmation =
    isEdit &&
    Boolean(orderStatus && orderStatus !== "RASCUNHO") &&
    initialSnapshotRef.current !== null &&
    (initialSnapshotRef.current.orderType !== currentSnapshot.orderType ||
      initialSnapshotRef.current.deliveryMethod !== currentSnapshot.deliveryMethod ||
      normalizeText(initialSnapshotRef.current.scheduleDate) !==
        normalizeText(currentSnapshot.scheduleDate) ||
      normalizeText(initialSnapshotRef.current.scheduleTime) !==
        normalizeText(currentSnapshot.scheduleTime) ||
      normalizeText(initialSnapshotRef.current.addressText) !==
        normalizeText(currentSnapshot.addressText) ||
      normalizeText(initialSnapshotRef.current.addressBairro) !==
        normalizeText(currentSnapshot.addressBairro) ||
      normalizeText(initialSnapshotRef.current.addressReferencia) !==
        normalizeText(currentSnapshot.addressReferencia) ||
      normalizeText(initialSnapshotRef.current.addressCity) !==
        normalizeText(currentSnapshot.addressCity) ||
      normalizeText(initialSnapshotRef.current.addressCep) !==
        normalizeText(currentSnapshot.addressCep) ||
      Math.abs(initialSnapshotRef.current.deliveryFee - currentSnapshot.deliveryFee) >
        0.0001 ||
      Math.abs(initialSnapshotRef.current.subtotal - currentSnapshot.subtotal) >
        0.0001 ||
      Math.abs(initialSnapshotRef.current.total - currentSnapshot.total) > 0.0001 ||
      initialSnapshotRef.current.items.length !== currentSnapshot.items.length ||
      initialSnapshotRef.current.items.some(
        (item, index) =>
          item.skuId !== currentSnapshot.items[index]?.skuId ||
          Math.abs(item.quantity - (currentSnapshot.items[index]?.quantity ?? 0)) >
            0.0001
      ));

  const addressHasInput = useMemo(() => {
    return [addressText, addressBairro, addressReferencia, addressCity].some(
      (value) => value.trim() !== ""
    );
  }, [addressText, addressBairro, addressReferencia, addressCity]);

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
    if (isEdit) {
      setCustomerMode("existing");
    }
    if (!customerOpen) return;
    setCustomerActiveIndex(filteredCustomers.length > 0 ? 0 : -1);
  }, [customerOpen, filteredCustomers, isEdit]);

  useEffect(() => {
    if (deliveryMethod !== "ENTREGA") {
      setSaveAddressAsDefault(false);
    }
  }, [deliveryMethod]);

  useEffect(() => {
    if (orderType === "PRONTA_ENTREGA") {
      setScheduleDate("");
      setScheduleTime("");
    }
  }, [orderType]);

  useEffect(() => {
    if (!hasDeposit) {
      setDepositAmount("");
    }
  }, [hasDeposit]);

  useEffect(() => {
    setSaveAddressAsDefault(false);
    setAddressAutofillHint("");
    lastAutofillRef.current = null;
  }, [customerId]);

  useEffect(() => {
    if (deliveryMethod !== "ENTREGA") {
      setAddressAutofillHint("");
      return;
    }
    if (customerMode !== "existing" || !customerId) return;
    if (addressHasInput) return;

    const key = `${customerId}:${deliveryMethod}`;
    if (lastAutofillRef.current === key) return;
    lastAutofillRef.current = key;

    let active = true;

    async function loadAddress() {
      try {
        const response = await fetch(
          `/api/customers/address?customerId=${customerId}`
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          address?: {
            addressText?: string | null;
            addressBairro?: string | null;
            addressReferencia?: string | null;
            addressCity?: string | null;
            addressCep?: string | null;
          } | null;
          source?: "customer_default" | "last_order" | "none";
        };
        if (!active || addressHasInput) return;
        if (!data.address) return;
        setAddressText(data.address.addressText ?? "");
        setAddressBairro(data.address.addressBairro ?? "");
        setAddressReferencia(data.address.addressReferencia ?? "");
        setAddressCity(data.address.addressCity ?? "");
        setAddressCep(data.address.addressCep ?? "");

        if (data.source === "customer_default") {
          setAddressAutofillHint(
            "Endereco preenchido com base no cadastro do cliente."
          );
        } else if (data.source === "last_order") {
          setAddressAutofillHint(
            "Endereco preenchido com base no ultimo pedido."
          );
        }
      } catch {
        // ignore
      }
    }

    loadAddress();

    return () => {
      active = false;
    };
  }, [addressHasInput, customerId, customerMode, deliveryMethod]);

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
    availabilityBypassRef.current = false;
    setAvailabilityWarning(false);
  }, [items]);

  useEffect(() => {
    reconfirmBypassRef.current = false;
  }, [requiresReconfirmation]);

  useEffect(() => {
    if (isEdit) return;
    if (errorCode) return;
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(DRAFT_KEY);
  }, [errorCode, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    if (!errorCode) return;
    if (typeof window === "undefined") return;
    const draft = parseDraft(sessionStorage.getItem(DRAFT_KEY));
    if (!draft) return;
    setCustomerMode(draft.customerMode);
    setCustomerId(draft.customerId);
    setCustomerSearch(draft.customerSearch);
    setCustomerName(draft.customerName);
    setCustomerPhone(draft.customerPhone);
    setDeliveryMethod(draft.deliveryMethod);
    setOrderType(draft.orderType);
    setSaveAddressAsDefault(draft.saveAddressAsDefault);
    setScheduleDate(draft.scheduleDate);
    setScheduleTime(draft.scheduleTime);
    setAddressText(draft.addressText);
    setAddressBairro(draft.addressBairro);
    setAddressReferencia(draft.addressReferencia);
    setAddressCity(draft.addressCity);
    setAddressCep(draft.addressCep);
    setDeliveryFee(draft.deliveryFee);
    setPaymentMethod(draft.paymentMethod);
    setHasDeposit(draft.hasDeposit);
    setDepositAmount(draft.depositAmount);
    setNotes(draft.notes);
    setCategoryId(draft.categoryId);
    setItems(draft.items);
  }, [errorCode, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    if (typeof window === "undefined") return;
    const draft: OrderDraft = {
      customerMode,
      customerId,
      customerSearch,
      customerName,
      customerPhone,
      deliveryMethod,
      orderType,
      saveAddressAsDefault,
      scheduleDate,
      scheduleTime,
      addressText,
      addressBairro,
      addressReferencia,
      addressCity,
      addressCep,
      deliveryFee,
      paymentMethod,
      hasDeposit,
      depositAmount,
      notes,
      categoryId,
      items,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    customerMode,
    customerId,
    customerSearch,
    customerName,
    customerPhone,
    deliveryMethod,
    orderType,
    saveAddressAsDefault,
    scheduleDate,
    scheduleTime,
    addressText,
    addressBairro,
    addressReferencia,
    addressCity,
    addressCep,
    deliveryFee,
    paymentMethod,
    hasDeposit,
    depositAmount,
    notes,
    categoryId,
    items,
    isEdit,
  ]);

  useEffect(() => {
    if (!errorCode) return;
    setSubmitAttempted(true);
    const focusMap: Record<string, () => void> = {
      "cliente-invalido": () => customerSearchRef.current?.focus(),
      "cliente-telefone-existente": () => customerSearchRef.current?.focus(),
      "cliente-telefone": () => customerPhoneRef.current?.focus(),
      "data-invalida": () => scheduleDateRef.current?.focus(),
      "hora-invalida": () => scheduleTimeRef.current?.focus(),
      "data-passada": () => scheduleTimeRef.current?.focus(),
      "endereco-invalido": () => addressTextRef.current?.focus(),
      "cidade-invalida": () => addressCityRef.current?.focus(),
      "taxa-vazia": () => deliveryFeeRef.current?.focus(),
      "taxa-negativa": () => deliveryFeeRef.current?.focus(),
      "taxa-invalida": () => deliveryFeeRef.current?.focus(),
      "pagamento-invalido": () => paymentMethodRef.current?.focus(),
      "sinal-invalido": () => depositAmountRef.current?.focus(),
      "sem-itens": () => skuInputRef.current?.focus(),
      "sku-invalido": () => skuInputRef.current?.focus(),
      "quantidade-invalida": () => skuInputRef.current?.focus(),
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
    const result = validateSkuQuantity(
      {
        unitType: item.unitType as "KG" | "UNIDADE" | "CENTO",
        minQty: item.minQty,
        quantityStep: item.quantityStep,
      },
      item.quantity
    );
    if (!result.ok) {
      if (result.error === "Quantidade invalida.") {
        return "Quantidade invalida para este SKU.";
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
      const normalizedPhone = normalizePhoneBR(customerPhone);
      if (!normalizedPhone) {
        errors.customerPhone = "Informe um telefone valido.";
      }
    }

    if (deliveryMethod === "ENTREGA") {
      const feeCheck = parseFeeValue(deliveryFee);
      if (!feeCheck.ok) {
        errors.deliveryFee = feeCheck.error;
      }
    }

    if (hasDeposit) {
      const depositCheck = parseDepositValue(depositAmount);
      if (!depositCheck.ok) {
        errors.depositAmount = depositCheck.error;
      }
    }

    if (orderType === "ENCOMENDA" && scheduleDate) {
      const checkTime = scheduleTime || "00:00";
      const schedule = buildLocalDate(scheduleDate, checkTime);
      if (!schedule) {
        errors.scheduleDate = "Informe uma data valida.";
      } else if (scheduleTime && schedule.getTime() <= Date.now()) {
        errors.scheduleTime = "Selecione uma data e horario no futuro.";
      } else if (!scheduleTime) {
        const today = new Date();
        const startToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );
        const startSchedule = new Date(
          schedule.getFullYear(),
          schedule.getMonth(),
          schedule.getDate()
        );
        if (startSchedule.getTime() < startToday.getTime()) {
          errors.scheduleDate = "Selecione uma data futura.";
        }
      }
    }

    for (const item of items) {
      const error = getItemError(item);
      if (error) {
        itemErrors[item.lineId] = error;
      }
    }

    if (isFinalOrder) {
      if (!finalEditConfirmed) {
        errors.finalEditReason = "Confirme a edicao de pedido finalizado.";
      } else if (!finalEditReason.trim()) {
        errors.finalEditReason = "Informe o motivo da edicao.";
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
  const hasItemErrors = Object.keys(validation.itemErrors).length > 0;
  const hasItems = items.length > 0;
  const itemsReady = hasItems && !hasItemErrors;

  const customerReady =
    customerMode === "existing"
      ? Boolean(customerId)
      : Boolean(customerName.trim()) && Boolean(normalizePhoneBR(customerPhone));

  const scheduleReady =
    orderType === "PRONTA_ENTREGA" ? true : Boolean(scheduleDate);
  const addressReady =
    deliveryMethod !== "ENTREGA"
      ? true
      : Boolean(addressText.trim()) && Boolean(addressCity.trim());

  const readyForConfirm = customerReady && itemsReady && scheduleReady;

  function formatScheduleDate(value: string) {
    const [year, month, day] = value.split("-").map((part) => Number(part));
    if (!year || !month || !day) return value;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
  }

  type ChecklistStatus = "ok" | "warning" | "danger" | "neutral";
  function getChecklistBadge(status: ChecklistStatus) {
    if (status === "ok") {
      return { label: "OK", className: styles.badgeSuccess };
    }
    if (status === "danger") {
      return { label: "Falta", className: styles.badgeDanger };
    }
    if (status === "warning") {
      return { label: "Atenção", className: styles.badgeWarning };
    }
    return { label: "Opcional", className: styles.badgeNeutral };
  }

  function applySearchToNewCustomer(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const digits = normalizePhoneDigits(trimmed);
    const hasLetters = /[a-zA-Z]/.test(trimmed);
    if (hasLetters) {
      setCustomerName(trimmed);
      if (digits.length >= 10) {
        setCustomerPhone(digits);
      }
      return;
    }
    if (digits) {
      setCustomerPhone(digits);
    }
  }

  function selectCustomer(customer: CustomerOption) {
    setCustomerId(customer.id);
    setCustomerSearch(formatCustomerLabel(customer));
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone ?? "");
    setCustomerOpen(false);
    setCustomerActiveIndex(-1);
    if (deliveryMethod === "ENTREGA") {
      setTimeout(() => deliveryMethodRef.current?.focus(), 0);
    }
  }

  function switchToNewCustomer(prefillSearch = false) {
    setCustomerMode("new");
    setCustomerId("");
    setCustomerOpen(false);
    if (prefillSearch) {
      applySearchToNewCustomer(customerSearch);
    } else {
      setCustomerName("");
      setCustomerPhone("");
    }
  }

  function switchToExistingCustomer() {
    setCustomerMode("existing");
    setCustomerOpen(false);
  }

  function handleSelectExistingFromError() {
    if (!existingCustomer) return;
    switchToExistingCustomer();
    if (existingCustomerOption) {
      selectCustomer(existingCustomerOption);
      return;
    }
    setCustomerId(existingCustomer.id);
    setCustomerSearch(existingCustomer.name);
    setCustomerName(existingCustomer.name);
  }

  const payload = JSON.stringify({
    orderId: isEdit ? orderId : undefined,
    customerMode,
    customerId: customerMode === "existing" ? customerId : undefined,
    newCustomer:
      customerMode === "new"
        ? {
            name: customerName,
            phone: customerPhone || undefined,
          }
        : undefined,
    scheduleDate: orderType === "ENCOMENDA" ? scheduleDate : undefined,
    scheduleTime: orderType === "ENCOMENDA" ? scheduleTime : undefined,
    deliveryMode: deliveryMethod,
    address:
      deliveryMethod === "ENTREGA"
        ? {
            addressText,
            addressBairro,
            addressReferencia,
            addressCity,
            addressCep,
          }
        : null,
    saveAddressAsDefault:
      deliveryMethod === "ENTREGA" ? saveAddressAsDefault : false,
    orderType,
    deliveryFee: deliveryMethod === "ENTREGA" ? deliveryFee : undefined,
    paymentMethod: paymentMethod || undefined,
    hasDeposit,
    depositAmount: hasDeposit ? depositAmount : undefined,
    notes,
    items: items.map((item) => ({
      skuId: item.skuId,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime,
    })),
    finalEditConfirmed,
    finalEditReason,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (validation.isValid) {
      if (isEdit && requiresReconfirmation && !reconfirmBypassRef.current) {
        event.preventDefault();
        const accepted = window.confirm(
          "Isso exigira reconfirmacao do pedido. Deseja continuar?"
        );
        if (!accepted) {
          return;
        }
        reconfirmBypassRef.current = true;
      }

      if (availabilityBypassRef.current) {
        availabilityBypassRef.current = false;
        setAvailabilityWarning(false);
        setAvailabilityWarningMode("unavailable");
        setFormError("");
        return;
      }

      event.preventDefault();
      setFormError("");
      setAvailabilityLoading(true);

      try {
        const response = await fetch("/api/orders/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderType,
            items: items.map((item) => ({
              skuId: item.skuId,
              quantity: item.quantity,
            })),
          }),
        });
        if (!response.ok) {
          setAvailabilityLoading(false);
          setFormError("Nao foi possivel verificar disponibilidade.");
          return;
        }
        const data = (await response.json()) as {
          hasUnavailableItems?: boolean;
          hasOutOfStockSkus?: boolean;
        };
        setAvailabilityLoading(false);
        if (data.hasOutOfStockSkus) {
          setAvailabilityWarning(true);
          setAvailabilityWarningMode("out_of_stock");
          return;
        }
        if (data.hasUnavailableItems) {
          setAvailabilityWarning(true);
          setAvailabilityWarningMode("unavailable");
          return;
        }
      } catch {
        setAvailabilityLoading(false);
        setFormError("Nao foi possivel verificar disponibilidade.");
        return;
      }

      availabilityBypassRef.current = true;
      formRef.current?.requestSubmit();
      return;
    }

    event.preventDefault();
    setSubmitAttempted(true);
    setFormError("Revise os campos destacados.");

    if (validation.errors.customerId) {
      customerSearchRef.current?.focus();
      return;
    }
    if (validation.errors.customerName) {
      customerNameRef.current?.focus();
      return;
    }
    if (validation.errors.customerPhone) {
      customerPhoneRef.current?.focus();
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
    if (validation.errors.depositAmount) {
      depositAmountRef.current?.focus();
      return;
    }
    if (validation.errors.finalEditReason) {
      finalEditReasonRef.current?.focus();
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

  const formAction = action ?? createOrderAction;

  return (
    <form
      ref={formRef}
      action={formAction}
      className={styles.stackMd}
      onSubmit={handleSubmit}
      noValidate
    >
      <input type="hidden" name="payload" value={payload} />
      <input ref={availabilityBypassInputRef} type="hidden" name="availabilityBypass" value="0" />

      {formError ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          {formError}
        </div>
      ) : null}

      {isEdit && requiresReconfirmation ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          Alteracoes criticas exigirao reconfirmacao do pedido.
        </div>
      ) : null}

      {isFinalOrder ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          <div className={styles.stackSm}>
            <div>
              <strong>Atencao:</strong> este pedido esta{" "}
              {orderStatus === "ENTREGUE" ? "ENTREGUE" : "CANCELADO"}.
              Voce ainda pode editar, mas precisa confirmar e informar um motivo
              (sera registrado na auditoria).
            </div>
            <label className={styles.choiceRow}>
              <input
                type="checkbox"
                checked={finalEditConfirmed}
                onChange={(e) => setFinalEditConfirmed(e.target.checked)}
              />
              <span className={styles.choiceLabel}>
                Confirmo que quero editar um pedido finalizado
              </span>
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Motivo da edicao</span>
              <textarea
                ref={finalEditReasonRef}
                value={finalEditReason}
                onChange={(e) => setFinalEditReason(e.target.value)}
                className={`${styles.control} ${
                  showErrors && validation.errors.finalEditReason
                    ? styles.controlError
                    : ""
                }`}
                rows={3}
              />
              {showErrors && validation.errors.finalEditReason ? (
                <span className={styles.fieldError}>
                  {validation.errors.finalEditReason}
                </span>
              ) : null}
            </label>
          </div>
        </div>
      ) : null}

      {availabilityWarning ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          <div className={styles.stackSm}>
            <div>
              {availabilityWarningMode === "out_of_stock" ? (
                <>
                  <strong>Atencao:</strong> Alguns itens deste pedido estao sem
                  estoque suficiente para pronta entrega.
                </>
              ) : (
                <>
                  <strong>Atencao:</strong> Alguns itens deste pedido nao estao
                  disponiveis no momento. Sera necessario produzir antes de atender.
                </>
              )}
            </div>
            <div>Voce ainda podera salvar o pedido.</div>
            <div className={styles.clusterSm}>
              <button
                type="button"
                className={styles.button}
                disabled={availabilityLoading}
                onClick={() => {
                  availabilityBypassRef.current = true;
                  setAvailabilityWarning(false);
                  setAvailabilityWarningMode("unavailable");
                  if (availabilityBypassInputRef.current) {
                    availabilityBypassInputRef.current.value = "1";
                  }
                  formRef.current?.requestSubmit();
                }}
              >
                Salvar mesmo assim
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost}`}
                onClick={() => setAvailabilityWarning(false)}
              >
                Revisar itens
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className={styles.pageGrid}>
        <div className={styles.pageMain}>
          <section className={`${styles.panel} ${styles.panelSecondary}`}>
            <div className={styles.panelHeader}>
              <h2>Cliente</h2>
            </div>
            <div className={styles.panelBody}>
              {isEdit ? (
                <div className={styles.stackSm}>
                  <div className={styles.fieldLabel}>Cliente</div>
                  <strong>{customerName || "Cliente"}</strong>
                  <span className={styles.textMuted}>
                    {customerPhone ? formatPhoneDisplay(customerPhone) : "-"}
                  </span>
                </div>
              ) : (
                <>
              <div className={styles.tabs}>
                <div className={styles.tabList} role="tablist" aria-label="Cliente">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={customerMode === "existing"}
                    className={`${styles.tabButton} ${
                      customerMode === "existing" ? styles.tabButtonActive : ""
                    }`}
                    onClick={() => switchToExistingCustomer()}
                  >
                    Cliente existente
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={customerMode === "new"}
                    className={`${styles.tabButton} ${
                      customerMode === "new" ? styles.tabButtonActive : ""
                    }`}
                    onClick={() => switchToNewCustomer(true)}
                  >
                    Novo cliente
                  </button>
                </div>
              </div>

              {errorCode === "cliente-telefone-existente" && existingCustomer ? (
                <div className={styles.notice}>
                  Este telefone ja existe para{" "}
                  {existingCustomerOption
                    ? formatCustomerLabel(existingCustomerOption)
                    : existingCustomer.name}
                  .
                  <button
                    type="button"
                    onClick={handleSelectExistingFromError}
                    className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                  >
                    Selecionar cliente existente
                  </button>
                </div>
              ) : null}

              {customerMode === "existing" ? (
                <div className={styles.stackSm}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Cliente existente</span>
                    <div className={styles.autocomplete}>
                      <input
                        ref={customerSearchRef}
                        type="text"
                        placeholder="Buscar por nome ou telefone"
                        value={customerSearch}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCustomerSearch(value);
                          if (customerId) {
                            setCustomerId("");
                            setCustomerName("");
                            setCustomerPhone("");
                          }
                          setCustomerOpen(true);
                        }}
                        onFocus={() => {
                          if (filteredCustomers.length > 0 || customerSearch.trim()) {
                            setCustomerOpen(true);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setCustomerOpen(false), 150);
                        }}
                        onKeyDown={(event) => {
                          if (!customerOpen) return;
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setCustomerActiveIndex((prev) =>
                              Math.min(prev + 1, filteredCustomers.length - 1)
                            );
                          }
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setCustomerActiveIndex((prev) => Math.max(prev - 1, 0));
                          }
                          if (event.key === "Enter") {
                            event.preventDefault();
                            const option = filteredCustomers[customerActiveIndex];
                            if (option) {
                              selectCustomer(option);
                            }
                          }
                          if (event.key === "Escape") {
                            setCustomerOpen(false);
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
                        role="combobox"
                        aria-expanded={customerOpen}
                        aria-controls="customer-listbox"
                        aria-autocomplete="list"
                        className={styles.control}
                      />
                      {customerOpen ? (
                        <ul
                          className={styles.autocompleteList}
                          role="listbox"
                          id="customer-listbox"
                        >
                          {filteredCustomers.length === 0 ? (
                            <li className={styles.autocompleteEmpty}>
                              Nenhum cliente encontrado.
                            </li>
                          ) : null}
                          {filteredCustomers.map((customer, index) => (
                            <li
                              key={customer.id}
                              role="option"
                              aria-selected={index === customerActiveIndex}
                              className={`${styles.autocompleteOption} ${
                                index === customerActiveIndex
                                  ? styles.autocompleteOptionActive
                                  : ""
                              }`}
                              onMouseDown={(event) => {
                                event.preventDefault();
                                selectCustomer(customer);
                              }}
                            >
                              <div className={styles.autocompleteMain}>
                                <strong>{customer.name}</strong>
                                {customer.phone ? (
                                  <span className={styles.textMuted}>
                                    {formatPhoneDisplay(customer.phone)}
                                  </span>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </label>
                  {showErrors && validation.errors.customerId ? (
                    <div id="customer-error" className={styles.fieldError}>
                      {validation.errors.customerId}
                    </div>
                  ) : null}
                  {customerSearch.trim() && filteredCustomers.length === 0 ? (
                    <div className={styles.clusterSm}>
                      <span className={styles.textMuted}>
                        Nenhum cliente encontrado.
                      </span>
                      <button
                        type="button"
                        onClick={() => switchToNewCustomer(true)}
                        className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                      >
                        Cadastrar novo cliente
                      </button>
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
                    <span className={styles.fieldLabel}>Telefone</span>
                    <input
                      ref={customerPhoneRef}
                      type="text"
                      placeholder="Telefone"
                      value={customerPhone}
                      onChange={(event) =>
                        setCustomerPhone(normalizePhoneDigits(event.target.value))
                      }
                      aria-invalid={
                        showErrors && Boolean(validation.errors.customerPhone)
                      }
                      aria-describedby={
                        showErrors && validation.errors.customerPhone
                          ? "customer-phone-error"
                          : undefined
                      }
                      className={styles.control}
                    />
                    {showErrors && validation.errors.customerPhone ? (
                      <span
                        id="customer-phone-error"
                        className={styles.fieldError}
                      >
                        {validation.errors.customerPhone}
                      </span>
                    ) : null}
                  </label>
                </div>
              )}
                </>
              )}
            </div>
          </section>

          <section
            id="order-items"
            className={`${styles.panel} ${styles.panelSecondary}`}
          >
            <div className={styles.panelHeader}>
              <h2>Itens</h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.itemsFiltersRow}>
                <label className={`${styles.field} ${styles.itemsFilterMain}`}>
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
                          <li className={styles.autocompleteEmpty}>Buscando...</li>
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
                              <span className={styles.autocompletePrice}>
                                R$ {formatCurrency(option.price)}
                              </span>
                            </div>
                            <div className={styles.autocompleteMetaRow}>
                              <span>
                                {option.categoryName}
                                {option.skuLabel ? ` - ${option.skuLabel}` : ""}
                              </span>
                              <span>{option.unit}</span>
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
                    Busque um produto acima.
                  </div>
                </div>
              ) : (
                <div className={styles.itemsList}>
                  <div className={`${styles.itemsRow} ${styles.itemsHeader}`}>
                    <div>Produto</div>
                    <div>Quantidade</div>
                    <div>Unidade</div>
                    <div className={styles.itemsCellNumeric}>Preco unitario</div>
                    <div className={styles.itemsCellNumeric}>Total</div>
                    <div className={styles.itemsCellActions}>Remover</div>
                  </div>
                  {itemsWithTotals.map((item) => {
                    const itemError = validation.itemErrors[item.lineId];
                    return (
                      <div key={item.lineId} className={styles.itemsRow}>
                        <div>
                          <div className={styles.itemsProductTitle}>
                            {item.productName}
                          </div>
                          <div className={styles.itemsProductMeta}>
                            {item.categoryName}
                            {item.skuLabel ? ` - ${item.skuLabel}` : ""}
                          </div>
                        </div>
                        <div>
                          <input
                            ref={(el) => {
                              qtyRefs.current[item.lineId] = el;
                            }}
                            type="text"
                            inputMode="decimal"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItemQuantity(item.lineId, event.target.value)
                            }
                            aria-invalid={showErrors && Boolean(itemError)}
                            aria-describedby={
                              showErrors && itemError
                                ? `qty-error-${item.lineId}`
                                : undefined
                            }
                            className={`${styles.control} ${styles.itemsQtyInput}`}
                          />
                          {showErrors && itemError ? (
                            <div
                              id={`qty-error-${item.lineId}`}
                              className={styles.fieldError}
                            >
                              {itemError}
                            </div>
                          ) : null}
                        </div>
                        <div>{item.unitLabel}</div>
                        <div className={styles.itemsCellNumeric}>
                          R$ {formatCurrency(item.priceAtTime)}
                        </div>
                        <div className={styles.itemsCellNumeric}>
                          R$ {formatCurrency(item.lineTotal)}
                        </div>
                        <div className={styles.itemsCellActions}>
                          <button
                            type="button"
                            onClick={() => removeItem(item.lineId)}
                            className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm} ${styles.itemsRemoveButton}`}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section
            id="order-delivery"
            className={`${styles.panel} ${styles.panelSecondary}`}
          >
            <div className={styles.panelHeader}>
              <h2>Entrega</h2>
            </div>
            <div className={styles.panelBody}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Encomenda ou pronta entrega?</span>
                <div
                  className={styles.segmented}
                  role="radiogroup"
                  aria-label="Tipo de pedido"
                >
                  <label
                    className={`${styles.segmentedOption} ${
                      orderType === "PRONTA_ENTREGA" ? styles.segmentedActive : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderType"
                      value="PRONTA_ENTREGA"
                      checked={orderType === "PRONTA_ENTREGA"}
                      onChange={() => setOrderType("PRONTA_ENTREGA")}
                    />
                    <span className={styles.segmentedTitle}>Pronta entrega</span>
                    <span className={styles.segmentedHelp}>
                      Usa a data e hora do cadastro.
                    </span>
                  </label>
                  <label
                    className={`${styles.segmentedOption} ${
                      orderType === "ENCOMENDA" ? styles.segmentedActive : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderType"
                      value="ENCOMENDA"
                      checked={orderType === "ENCOMENDA"}
                      onChange={() => setOrderType("ENCOMENDA")}
                    />
                    <span className={styles.segmentedTitle}>Encomenda</span>
                    <span className={styles.segmentedHelp}>
                      Informe data e horario quando houver.
                    </span>
                  </label>
                </div>
              </label>

              {orderType === "ENCOMENDA" ? (
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
                    <span className={styles.fieldLabel}>Horario (opcional)</span>
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
                      Informe quando souber. Horarios de 30 em 30 minutos.
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
              ) : (
                <div className={styles.textMuted}>
                  A data e o horario serao registrados automaticamente.
                </div>
              )}

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

              {deliveryMethod === "ENTREGA" ? (
                <div className={styles.stackSm}>
                  {addressAutofillHint ? (
                    <div className={styles.textMuted}>{addressAutofillHint}</div>
                  ) : null}
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
                {customerMode === "existing" && customerId ? (
                  <div className={styles.stackSm}>
                    <label className={styles.choiceRow}>
                      <input
                        type="checkbox"
                        checked={saveAddressAsDefault}
                        onChange={(event) =>
                          setSaveAddressAsDefault(event.target.checked)
                        }
                      />
                      <span className={styles.choiceLabel}>
                        Salvar endereco como padrao do cliente
                      </span>
                    </label>
                    <span className={styles.fieldHelp}>
                      Usa este endereco nos proximos pedidos.
                    </span>
                  </div>
                ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section
            id="order-payment"
            className={`${styles.panel} ${styles.panelSecondary}`}
          >
            <div className={styles.panelHeader}>
              <h2>Pagamento combinado</h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.stackSm}>
                <span className={styles.textMuted}>
                  Informativo: nao processamos pagamento.
                </span>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Forma de pagamento</span>
                    <select
                      ref={paymentMethodRef}
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className={styles.control}
                    >
                      <option value="">Selecione</option>
                      <option value="PIX">Pix</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="CARTAO">Cartao</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="A_COMBINAR">A combinar</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Teve sinal?</span>
                    <div
                      className={styles.segmented}
                      role="radiogroup"
                      aria-label="Sinal"
                    >
                      <label
                        className={`${styles.segmentedOption} ${
                          !hasDeposit ? styles.segmentedActive : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="hasDeposit"
                          value="no"
                          checked={!hasDeposit}
                          onChange={() => setHasDeposit(false)}
                        />
                        <span className={styles.segmentedTitle}>Nao</span>
                      </label>
                      <label
                        className={`${styles.segmentedOption} ${
                          hasDeposit ? styles.segmentedActive : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="hasDeposit"
                          value="yes"
                          checked={hasDeposit}
                          onChange={() => setHasDeposit(true)}
                        />
                        <span className={styles.segmentedTitle}>Sim</span>
                      </label>
                    </div>
                  </label>
                  {hasDeposit ? (
                    <label className={`${styles.field} ${styles.fieldFull}`}>
                      <span className={styles.fieldLabel}>Valor do sinal</span>
                      <input
                        ref={depositAmountRef}
                        type="text"
                        inputMode="decimal"
                        placeholder="R$ 0,00"
                        value={depositAmount}
                        onChange={(event) => setDepositAmount(event.target.value)}
                        aria-invalid={
                          showErrors && Boolean(validation.errors.depositAmount)
                        }
                        aria-describedby={
                          showErrors && validation.errors.depositAmount
                            ? "deposit-error"
                            : undefined
                        }
                        className={styles.control}
                      />
                      {showErrors && validation.errors.depositAmount ? (
                        <span id="deposit-error" className={styles.fieldError}>
                          {validation.errors.depositAmount}
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section
            id="order-notes"
            className={`${styles.panel} ${styles.panelSecondary}`}
          >
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
          <section
            className={`${styles.panel} ${styles.panelPrimary} ${styles.stickyPanel}`}
          >
            <div className={styles.panelHeader}>
              <h2>Resumo</h2>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.stackSm}>
                <div className={styles.stackSm}>
                  <div className={styles.textMuted}>Proxima acao</div>
                  <div className={styles.nextActionTitle}>
                    {readyForConfirm
                      ? "Pronto para confirmar o pedido."
                      : "Conclua os itens abaixo para confirmar."}
                  </div>
                </div>

                <ul className={styles.checklist}>
                  {(() => {
                    const status = customerReady ? "ok" : "danger";
                    const badge = getChecklistBadge(status);
                    const label =
                      customerMode === "existing"
                        ? customerName.trim()
                        : customerName.trim()
                        ? customerName.trim()
                        : "Nao informado";
                    return (
                      <li className={styles.checklistItem}>
                        <span className={`${styles.badge} ${badge.className}`}>
                          {badge.label}
                        </span>
                        <div className={styles.checklistContent}>
                          <span className={styles.checklistLabel}>Cliente</span>
                          <span className={styles.checklistValue}>{label}</span>
                        </div>
                      </li>
                    );
                  })()}

                  {(() => {
                    const status = itemsReady ? "ok" : "danger";
                    const badge = getChecklistBadge(status);
                    const label = hasItems
                      ? `${items.length} item(s)`
                      : "Nenhum item";
                    return (
                      <li className={styles.checklistItem}>
                        <span className={`${styles.badge} ${badge.className}`}>
                          {badge.label}
                        </span>
                        <div className={styles.checklistContent}>
                          <span className={styles.checklistLabel}>Itens</span>
                          <span className={styles.checklistValue}>{label}</span>
                        </div>
                      </li>
                    );
                  })()}

                  {(() => {
                    const status =
                      orderType === "PRONTA_ENTREGA"
                        ? "ok"
                        : scheduleReady
                        ? "ok"
                        : "danger";
                    const badge = getChecklistBadge(status);
                    const label =
                      orderType === "PRONTA_ENTREGA"
                        ? "Cadastro agora"
                        : scheduleDate
                        ? formatScheduleDate(scheduleDate)
                        : "Nao definida";
                    return (
                      <li className={styles.checklistItem}>
                        <span className={`${styles.badge} ${badge.className}`}>
                          {badge.label}
                        </span>
                        <div className={styles.checklistContent}>
                          <span className={styles.checklistLabel}>Data</span>
                          <span className={styles.checklistValue}>{label}</span>
                        </div>
                      </li>
                    );
                  })()}

                  {(() => {
                    const status =
                      orderType === "PRONTA_ENTREGA"
                        ? "neutral"
                        : scheduleTime
                        ? "ok"
                        : "neutral";
                    const badge = getChecklistBadge(status);
                    const label =
                      orderType === "PRONTA_ENTREGA"
                        ? "Agora"
                        : scheduleTime || "A confirmar";
                    return (
                      <li className={styles.checklistItem}>
                        <span className={`${styles.badge} ${badge.className}`}>
                          {badge.label}
                        </span>
                        <div className={styles.checklistContent}>
                          <span className={styles.checklistLabel}>Horario</span>
                          <span className={styles.checklistValue}>{label}</span>
                        </div>
                      </li>
                    );
                  })()}

                  {(() => {
                    if (deliveryMethod === "RETIRADA") {
                      const badge = getChecklistBadge("ok");
                      return (
                        <li className={styles.checklistItem}>
                          <span className={`${styles.badge} ${badge.className}`}>
                            {badge.label}
                          </span>
                          <div className={styles.checklistContent}>
                            <span className={styles.checklistLabel}>Entrega</span>
                            <span className={styles.checklistValue}>Retirada</span>
                          </div>
                        </li>
                      );
                    }
                    const status = addressReady ? "ok" : "warning";
                    const badge = getChecklistBadge(status);
                    const label = addressReady
                      ? "Endereco informado"
                      : "Endereco pendente";
                    return (
                      <li className={styles.checklistItem}>
                        <span className={`${styles.badge} ${badge.className}`}>
                          {badge.label}
                        </span>
                        <div className={styles.checklistContent}>
                          <span className={styles.checklistLabel}>Entrega</span>
                          <span className={styles.checklistValue}>{label}</span>
                        </div>
                      </li>
                    );
                  })()}
                </ul>

                <div className={styles.divider} />

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

