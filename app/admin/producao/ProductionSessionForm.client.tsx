"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createProductionSessionAction } from "./actions";
import { validateSkuQuantity } from "@/lib/quantity";
import styles from "../_styles/adminPrimitives.module.css";
import { InlineNotice } from "../design-system/InlineNotice.client";

const DRAFT_KEY = "production-session-draft-v1";

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

type ProductionItem = {
  lineId: string;
  skuId: string;
  skuLabel: string;
  productName: string;
  categoryName: string;
  unitLabel: string | null;
  unitType: string | null;
  minQty: number;
  quantityStep: number;
  quantity: string;
  note: string;
};

type ProductionDraft = {
  producedAt: string;
  note: string;
  items: ProductionItem[];
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDraft(raw: string | null): ProductionDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ProductionDraft>;
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const record = item as Record<string, unknown>;
            const skuId = typeof record.skuId === "string" ? record.skuId : "";
            const skuLabel =
              typeof record.skuLabel === "string" ? record.skuLabel : "";
            const productName =
              typeof record.productName === "string" ? record.productName : "";
            const categoryName =
              typeof record.categoryName === "string" ? record.categoryName : "";
            if (!skuId || !skuLabel || !productName) return null;
            return {
              lineId:
                typeof record.lineId === "string"
                  ? record.lineId
                  : `line-${Date.now()}`,
              skuId,
              skuLabel,
              productName,
              categoryName,
              unitLabel:
                typeof record.unitLabel === "string" ? record.unitLabel : null,
              unitType:
                typeof record.unitType === "string" ? record.unitType : null,
              minQty:
                typeof record.minQty === "number" ? record.minQty : 1,
              quantityStep:
                typeof record.quantityStep === "number" ? record.quantityStep : 1,
              quantity:
                typeof record.quantity === "string" ? record.quantity : "1",
              note: typeof record.note === "string" ? record.note : "",
            } satisfies ProductionItem;
          })
          .filter((item): item is ProductionItem => Boolean(item))
      : [];
    return {
      producedAt:
        typeof parsed.producedAt === "string" ? parsed.producedAt : "",
      note: typeof parsed.note === "string" ? parsed.note : "",
      items,
    };
  } catch {
    return null;
  }
}

function getItemError(item: ProductionItem) {
  if (!item.unitType) return "SKU sem regras de unidade.";
  const result = validateSkuQuantity(
    {
      unitType: item.unitType as "KG" | "UNIDADE" | "CENTO",
      minQty: item.minQty,
      quantityStep: item.quantityStep,
    },
    item.quantity
  );
  if (!result.ok) return result.error;
  return "";
}

export default function ProductionSessionForm({
  errorCode,
  created,
}: {
  errorCode?: string;
  created?: boolean;
}) {
  const todayLabel = useMemo(() => formatDateInput(new Date()), []);
  const [producedAt, setProducedAt] = useState(todayLabel);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState("");

  const [skuQuery, setSkuQuery] = useState("");
  const [skuResults, setSkuResults] = useState<SkuOption[]>([]);
  const [skuOpen, setSkuOpen] = useState(false);
  const [skuActiveIndex, setSkuActiveIndex] = useState(-1);
  const [skuStatus, setSkuStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [selectedSku, setSelectedSku] = useState<SkuOption | null>(null);
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemNote, setItemNote] = useState("");
  const [newItemError, setNewItemError] = useState("");

  const lineIdRef = useRef(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const skuInputRef = useRef<HTMLInputElement | null>(null);

  const errorMessage = useMemo(() => {
    if (!errorCode) return "";
    const map: Record<string, string> = {
      "data-invalida": "Informe uma data valida.",
      "sem-itens": "Adicione pelo menos um item.",
      "sku-invalido": "Selecione um SKU valido.",
      "quantidade-invalida": "Quantidade invalida para o SKU.",
    };
    return map[errorCode] ?? "Nao foi possivel salvar a producao.";
  }, [errorCode]);

  useEffect(() => {
    if (errorCode || !created) return;
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(DRAFT_KEY);
  }, [created, errorCode]);

  useEffect(() => {
    if (!errorCode) return;
    if (typeof window === "undefined") return;
    const draft = parseDraft(sessionStorage.getItem(DRAFT_KEY));
    if (!draft) return;
    setProducedAt(draft.producedAt || todayLabel);
    setNote(draft.note);
    setItems(draft.items);
  }, [errorCode, todayLabel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft: ProductionDraft = {
      producedAt,
      note,
      items,
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [producedAt, note, items]);

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

  function selectSku(option: SkuOption) {
    setSelectedSku(option);
    setSkuQuery(`${option.productName} - ${option.skuLabel}`);
    setSkuOpen(false);
    setSkuActiveIndex(-1);
    setItemQuantity(option.minQty ? String(option.minQty) : "1");
    setNewItemError("");
  }

  function addItem() {
    if (!selectedSku) {
      setNewItemError("Selecione um SKU.");
      return;
    }
    if (!selectedSku.unitType) {
      setNewItemError("SKU sem regras de unidade.");
      return;
    }

    const result = validateSkuQuantity(
      {
        unitType: selectedSku.unitType as "KG" | "UNIDADE" | "CENTO",
        minQty: selectedSku.minQty,
        quantityStep: selectedSku.quantityStep,
      },
      itemQuantity || ""
    );

    if (!result.ok) {
      setNewItemError(result.error);
      return;
    }

    const lineId = `line-${Date.now()}-${lineIdRef.current++}`;
    const next: ProductionItem = {
      lineId,
      skuId: selectedSku.skuId,
      skuLabel: selectedSku.skuLabel,
      productName: selectedSku.productName,
      categoryName: selectedSku.categoryName,
      unitLabel: selectedSku.unitLabel,
      unitType: selectedSku.unitType,
      minQty: selectedSku.minQty,
      quantityStep: selectedSku.quantityStep,
      quantity: String(result.normalized),
      note: itemNote.trim(),
    };

    setItems((prev) => [...prev, next]);
    setSelectedSku(null);
    setSkuQuery("");
    setItemQuantity("1");
    setItemNote("");
    setNewItemError("");
    skuInputRef.current?.focus();
  }

  function updateItem(lineId: string, field: "quantity" | "note", value: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.lineId === lineId ? { ...item, [field]: value } : item
      )
    );
  }

  function removeItem(lineId: string) {
    setItems((prev) => prev.filter((item) => item.lineId !== lineId));
  }

  const itemErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const item of items) {
      const error = getItemError(item);
      if (error) {
        errors[item.lineId] = error;
      }
    }
    return errors;
  }, [items]);

  function validateForm() {
    const errors: Record<string, string> = {};
    if (items.length === 0) {
      errors.items = "Adicione pelo menos um item.";
    }
    if (Object.keys(itemErrors).length > 0) {
      errors.items = "Revise as quantidades informadas.";
    }
    return {
      errors,
      isValid: Object.keys(errors).length === 0,
    };
  }

  const validation = validateForm();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (validation.isValid) {
      setFormError("");
      return;
    }

    event.preventDefault();
    setSubmitAttempted(true);
    setFormError("Revise os itens informados.");
  }

  const payload = JSON.stringify({
    producedAt,
    note,
    items: items.map((item) => ({
      skuId: item.skuId,
      quantity: item.quantity,
      note: item.note,
    })),
  });

  return (
    <form
      ref={formRef}
      action={createProductionSessionAction}
      className={styles.stackMd}
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="payload" value={payload} />

      {created ? (
        <InlineNotice tone="success" clearQueryKeys={["created"]}>
          Producao registrada com sucesso.
        </InlineNotice>
      ) : null}

      {errorMessage ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          {errorMessage}
        </div>
      ) : null}

      {formError ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          {formError}
        </div>
      ) : null}

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Data da producao</span>
          <input
            type="date"
            value={producedAt}
            onChange={(event) => setProducedAt(event.target.value)}
            className={styles.control}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Nota (opcional)</span>
          <input
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ex: producao do dia"
            className={styles.control}
          />
        </label>
      </div>

      <div className={styles.panelSub}>
        <div className={styles.stackSm}>
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
                value={itemQuantity}
                onChange={(event) => setItemQuantity(event.target.value)}
                className={styles.control}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Nota do item</span>
              <input
                type="text"
                value={itemNote}
                onChange={(event) => setItemNote(event.target.value)}
                className={styles.control}
              />
            </label>
          </div>

          {newItemError ? (
            <div className={styles.fieldError}>{newItemError}</div>
          ) : null}

          <button type="button" className={styles.button} onClick={addItem}>
            Adicionar item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>Nenhum item adicionado.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Quantidade</th>
                <th>Nota</th>
                <th className={styles.tableActions}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.lineId}>
                  <td>
                    <div>{item.productName}</div>
                    <div className={styles.textMuted}>{item.skuLabel}</div>
                    <div className={styles.textMuted}>{item.categoryName}</div>
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(item.lineId, "quantity", event.target.value)
                      }
                      className={styles.control}
                    />
                    {submitAttempted && itemErrors[item.lineId] ? (
                      <div className={styles.fieldError}>
                        {itemErrors[item.lineId]}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.note}
                      onChange={(event) =>
                        updateItem(item.lineId, "note", event.target.value)
                      }
                      className={styles.control}
                    />
                  </td>
                  <td className={styles.tableActions}>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                      onClick={() => removeItem(item.lineId)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {submitAttempted && validation.errors.items ? (
        <div className={styles.fieldError}>{validation.errors.items}</div>
      ) : null}

      <div className={styles.panelFooter}>
        <button type="submit" className={styles.buttonPrimary}>
          Salvar producao
        </button>
      </div>
    </form>
  );
}
