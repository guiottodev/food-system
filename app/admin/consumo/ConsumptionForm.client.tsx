"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createConsumptionAction } from "./actions";
import { validateSkuQuantity } from "@/lib/quantity";
import styles from "../_styles/adminPrimitives.module.css";
import { InlineNotice } from "../design-system/InlineNotice.client";

const DRAFT_KEY = "production-consumption-draft-v1";

type SkuOption = {
  skuId: string;
  skuLabel: string;
  productName: string;
  categoryName: string;
  unitLabel: string | null;
  unitType: string | null;
  minQty: number;
  quantityStep: number;
};

type ConsumptionDraft = {
  skuQuery: string;
  selectedSku: SkuOption | null;
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
      skuQuery: typeof parsed.skuQuery === "string" ? parsed.skuQuery : "",
      selectedSku:
        parsed.selectedSku && typeof parsed.selectedSku === "object"
          ? (parsed.selectedSku as SkuOption)
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
  const [skuQuery, setSkuQuery] = useState("");
  const [skuResults, setSkuResults] = useState<SkuOption[]>([]);
  const [skuOpen, setSkuOpen] = useState(false);
  const [skuActiveIndex, setSkuActiveIndex] = useState(-1);
  const [skuStatus, setSkuStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [selectedSku, setSelectedSku] = useState<SkuOption | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [sourceType, setSourceType] = useState<"IMMEDIATE" | "MANUAL">("IMMEDIATE");
  const [note, setNote] = useState("");
  const [windowValue, setWindowValue] = useState(windowKey ?? "7");
  const [confirmWarnings, setConfirmWarnings] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);
  const skuInputRef = useRef<HTMLInputElement | null>(null);

  const errorMessage = useMemo(() => {
    if (!errorCode) return "";
    const map: Record<string, string> = {
      "sku-invalido": "Selecione um SKU valido.",
      "quantidade-invalida": "Quantidade invalida para o SKU.",
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
    setSkuQuery(draft.skuQuery);
    setSelectedSku(draft.selectedSku);
    setQuantity(draft.quantity);
    setSourceType(draft.sourceType);
    setNote(draft.note);
    setWindowValue(draft.window);
  }, [errorCode, hasWarnings]);

  useEffect(() => {
    const draft: ConsumptionDraft = {
      skuQuery,
      selectedSku,
      quantity,
      sourceType,
      note,
      window: windowValue,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [skuQuery, selectedSku, quantity, sourceType, note, windowValue]);

  useEffect(() => {
    if (!skuQuery.trim()) {
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
        params.set("q", skuQuery.trim());
        params.set("limit", "10");
        const response = await fetch(
          `/api/products/search?${params.toString()}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("request-failed");
        }
        const data = (await response.json()) as { items?: SkuOption[] };
        if (controller.signal.aborted) return;
        const next = data.items ?? [];
        setSkuResults(next);
        setSkuOpen(true);
        setSkuActiveIndex(next.length > 0 ? 0 : -1);
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
  }, [skuQuery]);

  useEffect(() => {
    if (!skuOpen) return;
    setSkuActiveIndex(skuResults.length > 0 ? 0 : -1);
  }, [skuOpen, skuResults]);

  useEffect(() => {
    if (!confirmWarnings) return;
    formRef.current?.requestSubmit();
  }, [confirmWarnings]);

  function selectSku(option: SkuOption) {
    setSelectedSku(option);
    setSkuQuery(`${option.productName} - ${option.skuLabel}`);
    setSkuOpen(false);
    setSkuActiveIndex(-1);
    setQuantity(option.minQty ? String(option.minQty) : "1");
    setFormError("");
  }

  function validateForm() {
    if (!selectedSku) {
      return "Selecione um SKU.";
    }
    if (!selectedSku.unitType) {
      return "SKU sem regras de unidade.";
    }
    const result = validateSkuQuantity(
      {
        unitType: selectedSku.unitType as "KG" | "UNIDADE" | "CENTO",
        minQty: selectedSku.minQty,
        quantityStep: selectedSku.quantityStep,
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
    skuId: selectedSku?.skuId,
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
        <InlineNotice tone="success" clearQueryKeys={["created"]}>
          Consumo registrado com sucesso.
        </InlineNotice>
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
                <strong>Consumo maior que o disponível.</strong> O sistema
                permitirá o registro, mas irá gerar pendência de produção.
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
        <span className={styles.fieldLabel}>SKU</span>
        <div className={styles.autocomplete}>
          <input
            ref={skuInputRef}
            type="text"
            placeholder="Buscar SKU"
            value={skuQuery}
            onChange={(event) => {
              setSkuQuery(event.target.value);
              setSelectedSku(null);
            }}
            onFocus={() => {
              if (skuResults.length > 0 || skuQuery.trim()) {
                setSkuOpen(true);
              }
            }}
            onBlur={() => setTimeout(() => setSkuOpen(false), 150)}
            onKeyDown={(event) => {
              if (!skuOpen) return;
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
                  selectSku(option);
                }
              }
              if (event.key === "Escape") {
                setSkuOpen(false);
              }
            }}
            className={styles.control}
            aria-invalid={submitAttempted && Boolean(formError)}
          />
          {skuOpen ? (
            <ul className={styles.autocompleteList}>
              {skuResults.length === 0 ? (
                <li className={styles.autocompleteEmpty}>
                  {skuStatus === "loading"
                    ? "Buscando..."
                    : "Nenhum SKU encontrado."}
                </li>
              ) : null}
              {skuResults.map((option, index) => (
                <li
                  key={option.skuId}
                  className={`${styles.autocompleteOption} ${
                    index === skuActiveIndex
                      ? styles.autocompleteOptionActive
                      : ""
                  }`}
                  onMouseDown={() => selectSku(option)}
                >
                  <div className={styles.autocompleteMain}>
                    <span>{option.productName}</span>
                    <span className={styles.autocompleteMeta}>
                      {option.skuLabel}
                    </span>
                  </div>
                  <span className={styles.autocompleteMeta}>
                    {option.categoryName} · {option.unitLabel ?? option.unitType ?? ""}
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
