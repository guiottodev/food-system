"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createConsumptionAction } from "./actions";
import { validateSkuQuantity } from "@/lib/quantity";
import styles from "../_styles/adminPrimitives.module.css";

const DRAFT_KEY = "production-consumption-draft-v1";

type ProductOption = {
  id: string;
  name: string;
  categoryName: string;
  unitLabel: string | null;
  unitType: string | null;
  minQty: number;
  quantityStep: number;
};

type ConsumptionDraft = {
  productQuery: string;
  selectedProduct: ProductOption | null;
  quantity: string;
  sourceType: "IMMEDIATE" | "MANUAL";
  note: string;
  window: string;
};

const windowOptions = [
  { value: "today", label: "Hoje" },
  { value: "7", label: "7 dias" },
  { value: "14", label: "14 dias" },
  { value: "30", label: "30 dias" },
];

function parseDraft(raw: string | null): ConsumptionDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsumptionDraft>;
    return {
      productQuery:
        typeof parsed.productQuery === "string" ? parsed.productQuery : "",
      selectedProduct:
        parsed.selectedProduct && typeof parsed.selectedProduct === "object"
          ? (parsed.selectedProduct as ProductOption)
          : null,
      quantity: typeof parsed.quantity === "string" ? parsed.quantity : "1",
      sourceType: parsed.sourceType === "MANUAL" ? "MANUAL" : "IMMEDIATE",
      note: typeof parsed.note === "string" ? parsed.note : "",
      window: typeof parsed.window === "string" ? parsed.window : "7",
    };
  } catch {
    return null;
  }
}

function formatDateLabel(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return value;
  }
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(parsed);
}

export default function ConsumptionForm({
  errorCode,
  created,
  warnImpact,
  warnNegative,
  demand,
  gap,
  windowEnd,
  quantity: warnedQuantity,
  windowKey,
}: {
  errorCode?: string;
  created?: boolean;
  warnImpact?: boolean;
  warnNegative?: boolean;
  demand?: number;
  gap?: number;
  windowEnd?: string;
  quantity?: number;
  windowKey?: string;
}) {
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductOption[]>([]);
  const [productOpen, setProductOpen] = useState(false);
  const [productActiveIndex, setProductActiveIndex] = useState(-1);
  const [productStatus, setProductStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(
    null
  );
  const [quantity, setQuantity] = useState("1");
  const [sourceType, setSourceType] = useState<"IMMEDIATE" | "MANUAL">("IMMEDIATE");
  const [note, setNote] = useState("");
  const [windowValue, setWindowValue] = useState(windowKey ?? "7");
  const [confirmWarnings, setConfirmWarnings] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const productInputRef = useRef<HTMLInputElement | null>(null);

  const errorMessage = useMemo(() => {
    if (!errorCode) return "";
    const map: Record<string, string> = {
      "produto-invalido": "Selecione um produto valido.",
      "quantidade-invalida": "Quantidade invalida para o produto.",
    };
    return map[errorCode] ?? "Nao foi possivel registrar o consumo.";
  }, [errorCode]);

  const hasWarnings = Boolean(warnImpact || warnNegative);
  const windowLabel = formatDateLabel(windowEnd ?? "");

  useEffect(() => {
    if (errorCode || hasWarnings || !created) return;
    sessionStorage.removeItem(DRAFT_KEY);
  }, [created, errorCode, hasWarnings]);

  useEffect(() => {
    if (!errorCode && !hasWarnings) return;
    const draft = parseDraft(sessionStorage.getItem(DRAFT_KEY));
    if (!draft) return;
    setProductQuery(draft.productQuery);
    setSelectedProduct(draft.selectedProduct);
    setQuantity(draft.quantity);
    setSourceType(draft.sourceType);
    setNote(draft.note);
    setWindowValue(draft.window);
  }, [errorCode, hasWarnings]);

  useEffect(() => {
    const draft: ConsumptionDraft = {
      productQuery,
      selectedProduct,
      quantity,
      sourceType,
      note,
      window: windowValue,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [productQuery, selectedProduct, quantity, sourceType, note, windowValue]);

  useEffect(() => {
    if (!productQuery.trim()) {
      setProductResults([]);
      setProductOpen(false);
      setProductActiveIndex(-1);
      setProductStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setProductStatus("loading");
      try {
        const params = new URLSearchParams();
        params.set("q", productQuery.trim());
        params.set("limit", "10");
        const response = await fetch(
          `/api/products/lookup?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("request-failed");
        }
        const data = (await response.json()) as { items?: ProductOption[] };
        if (controller.signal.aborted) return;
        const next = data.items ?? [];
        setProductResults(next);
        setProductOpen(true);
        setProductActiveIndex(next.length > 0 ? 0 : -1);
        setProductStatus("idle");
      } catch {
        if (controller.signal.aborted) return;
        setProductStatus("error");
        setProductResults([]);
        setProductOpen(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [productQuery]);

  useEffect(() => {
    if (!productOpen) return;
    setProductActiveIndex(productResults.length > 0 ? 0 : -1);
  }, [productOpen, productResults]);

  useEffect(() => {
    if (!confirmWarnings) return;
    formRef.current?.requestSubmit();
  }, [confirmWarnings]);

  function selectProduct(option: ProductOption) {
    setSelectedProduct(option);
    setProductQuery(option.name);
    setProductOpen(false);
    setProductActiveIndex(-1);
    setFormError("");
  }

  function validateForm() {
    if (!selectedProduct) {
      return "Selecione um produto.";
    }
    if (!selectedProduct.unitType) {
      return "Produto sem regras de unidade.";
    }
    const result = validateSkuQuantity(
      {
        unitType: selectedProduct.unitType as "KG" | "UNIDADE" | "CENTO",
        minQty: selectedProduct.minQty,
        quantityStep: selectedProduct.quantityStep,
      },
      quantity
    );
    if (!result.ok) {
      return result.error;
    }
    return "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const error = validateForm();
    if (!error) {
      setFormError("");
      return;
    }
    event.preventDefault();
    setSubmitAttempted(true);
    setFormError(error);
  }

  const payload = JSON.stringify({
    productId: selectedProduct?.id,
    quantity,
    sourceType,
    note,
    window: windowValue,
    confirmWarnings,
  });

  return (
    <form
      ref={formRef}
      action={createConsumptionAction}
      className={styles.stackMd}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="payload" value={payload} />

      {created ? (
        <div className={styles.notice}>Consumo registrado com sucesso.</div>
      ) : null}

      {errorMessage ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          {errorMessage}
        </div>
      ) : null}

      {hasWarnings ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          <div className={styles.stackSm}>
            {warnImpact ? (
              <div>
                <strong>Atencao: impacto na producao.</strong> Voce tem{" "}
                {demand} unidade(s) prometida(s) nos proximos dias. Se consumir{" "}
                {warnedQuantity} agora, sera necessario produzir {gap} ate{" "}
                {windowLabel} para atender as encomendas.
              </div>
            ) : null}
            {warnNegative ? (
              <div>
                <strong>Consumo maior que o disponivel.</strong> O sistema
                permitira o registro, mas o saldo ficara negativo. Revise os
                lancamentos de producao.
              </div>
            ) : null}
            <div className={styles.clusterSm}>
              <button
                type="button"
                className={styles.button}
                onClick={() => setConfirmWarnings(true)}
              >
                Continuar mesmo assim
              </button>
              <a
                href="/admin/consumo"
                className={`${styles.button} ${styles.buttonGhost}`}
              >
                Cancelar
              </a>
            </div>
          </div>
        </div>
      ) : null}

      {formError ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          {formError}
        </div>
      ) : null}

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Produto</span>
        <div className={styles.autocomplete}>
          <input
            ref={productInputRef}
            type="text"
            placeholder="Buscar produto"
            value={productQuery}
            onChange={(event) => {
              setProductQuery(event.target.value);
              setSelectedProduct(null);
            }}
            onFocus={() => {
              if (productResults.length > 0 || productQuery.trim()) {
                setProductOpen(true);
              }
            }}
            onBlur={() => setTimeout(() => setProductOpen(false), 150)}
            onKeyDown={(event) => {
              if (!productOpen) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setProductActiveIndex((prev) =>
                  Math.min(prev + 1, productResults.length - 1)
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setProductActiveIndex((prev) => Math.max(prev - 1, 0));
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const option = productResults[productActiveIndex];
                if (option) {
                  selectProduct(option);
                }
              }
              if (event.key === "Escape") {
                setProductOpen(false);
              }
            }}
            className={styles.control}
            aria-invalid={submitAttempted && Boolean(formError)}
          />
          {productOpen ? (
            <ul className={styles.autocompleteList}>
              {productResults.length === 0 ? (
                <li className={styles.autocompleteEmpty}>
                  {productStatus === "loading"
                    ? "Buscando..."
                    : "Nenhum produto encontrado."}
                </li>
              ) : null}
              {productResults.map((option, index) => (
                <li
                  key={option.id}
                  className={`${styles.autocompleteOption} ${
                    index === productActiveIndex
                      ? styles.autocompleteOptionActive
                      : ""
                  }`}
                  onMouseDown={() => selectProduct(option)}
                >
                  <div className={styles.autocompleteMain}>
                    <span>{option.name}</span>
                    <span className={styles.autocompleteMeta}>
                      {option.unitLabel ?? option.unitType ?? ""}
                    </span>
                  </div>
                  <span className={styles.autocompleteMeta}>
                    {option.categoryName}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </label>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Quantidade</span>
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={styles.control}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Janela de impacto</span>
          <select
            value={windowValue}
            onChange={(event) => setWindowValue(event.target.value)}
            className={styles.control}
          >
            {windowOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Origem</span>
          <select
            value={sourceType}
            onChange={(event) =>
              setSourceType(event.target.value === "MANUAL" ? "MANUAL" : "IMMEDIATE")
            }
            className={styles.control}
          >
            <option value="IMMEDIATE">Pronta entrega</option>
            <option value="MANUAL">Ajuste manual</option>
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nota (opcional)</span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className={styles.control}
          />
        </label>
      </div>

      <div className={styles.panelFooter}>
        <button type="submit" className={styles.buttonPrimary}>
          Registrar consumo
        </button>
      </div>
    </form>
  );
}
