"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  normalizeKey,
  validateSkuAttributes,
  type SkuAttributeInput,
} from "@/lib/validation/skuAttributes";
import {
  validateSkuFormValues,
  type SkuFormErrors,
  type SkuFormValues,
} from "@/lib/skuFormValidation";
import Select, { type SelectOption } from "../../_components/Select";
import Switch from "../../_components/Switch";
import styles from "../../_styles/adminPrimitives.module.css";
import detailStyles from "./productDetail.module.css";
import { InlineNotice } from "../../design-system/InlineNotice.client";

type SkuView = {
  id: string;
  displayName: string;
  sizeText: string;
  flavorText: string;
  attributes: SkuAttributeInput[];
  attributesJson: string | null;
  isFrozen: boolean;
  unitType: string;
  unitLabel: string;
  quantityStep: number;
  minQty: number;
  priceCurrent: number;
  cost: number | null;
  isActive: boolean;
  tags: string[];
};

type SkuFormMode = "new" | "edit";

type ProductSkusSectionProps = {
  productId: string;
  skus: SkuView[];
  createSkuAction: (formData: FormData) => void;
  updateSkuAction: (formData: FormData) => void;
  duplicateSkuAction: (formData: FormData) => void;
  initialMode?: SkuFormMode;
  initialSkuId?: string | null;
  skuErrorMessage?: string;
  showReadyNotice?: boolean;
};

const unitTypeOptions = [
  { value: "UNIDADE", label: "UNIDADE" },
  { value: "KG", label: "KG" },
];

const maxAttributes = 15;

function createEmptyAttribute(): SkuAttributeInput {
  return { key: "", value: "" };
}

function getInitialAttributes(sku: SkuView | null): SkuAttributeInput[] {
  if (sku?.attributes?.length) {
    return sku.attributes.map((attr) => ({
      key: attr.key,
      value: attr.value,
    }));
  }
  return [createEmptyAttribute()];
}

function SkuFormActions({
  onCancel,
  disableSave = false,
}: {
  onCancel: () => void;
  disableSave?: boolean;
}) {
  const { pending } = useFormStatus();
  const saveDisabled = pending || disableSave;
  return (
    <div className={detailStyles.modalFooter}>
      <button
        type="button"
        className={`${styles.button} ${styles.buttonGhost}`}
        disabled={pending}
        onClick={onCancel}
      >
        Cancelar
      </button>
      <button
        type="submit"
        className={`${styles.button} ${styles.buttonPrimary}`}
        disabled={saveDisabled}
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}

export default function ProductSkusSection({
  productId,
  skus,
  createSkuAction,
  updateSkuAction,
  duplicateSkuAction,
  initialMode,
  initialSkuId,
  skuErrorMessage,
  showReadyNotice = false,
}: ProductSkusSectionProps) {
  const initialSku = useMemo(
    () =>
      initialSkuId
        ? skus.find((sku) => sku.id === initialSkuId) ?? null
        : null,
    [initialSkuId, skus]
  );
  const shouldOpenInitial = Boolean(initialMode || skuErrorMessage);
  const [modalOpen, setModalOpen] = useState(shouldOpenInitial);
  const [mode, setMode] = useState<SkuFormMode>(initialMode ?? "new");
  const [activeSkuId, setActiveSkuId] = useState<string | null>(
    initialSku?.id ?? null
  );
  const [modalError, setModalError] = useState(skuErrorMessage ?? "");
  const [displayName, setDisplayName] = useState(() => initialSku?.displayName ?? "");
  const [unitTypeValue, setUnitTypeValue] = useState(
    () => initialSku?.unitType ?? "UNIDADE"
  );
  // Formatar preço para exibição (formato brasileiro: "10,50")
  const formatPriceForDisplay = (value: number): string => {
    return value.toFixed(2).replace(".", ",");
  };

  // Formatar entrada de preço (máscara monetária brasileira)
  // Aceita digitação natural: "10" → "0,10", "100" → "1,00", "1000" → "10,00"
  const formatPriceInput = (value: string): string => {
    const numbers = value.replace(/\D/g, "");
    if (!numbers) return "";
    const num = Number(numbers) / 100;
    return num.toFixed(2).replace(".", ",");
  };

  // Converter string formatada para número
  const parsePriceFromDisplay = (value: string): number => {
    const normalized = value.replace(",", ".");
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  };

  const [priceValue, setPriceValue] = useState(() =>
    initialSku ? formatPriceForDisplay(initialSku.priceCurrent) : ""
  );
  const [isActiveValue, setIsActiveValue] = useState(
    () => initialSku?.isActive ?? true
  );
  const [fieldErrors, setFieldErrors] = useState<SkuFormErrors>({});
  const unitTypeSelectRef = useRef<HTMLDivElement | null>(null);
  const [attributeRows, setAttributeRows] = useState<SkuAttributeInput[]>(
    () => getInitialAttributes(initialSku)
  );
  const [showAttributeError, setShowAttributeError] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const valueInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const activeSku = useMemo(
    () => skus.find((sku) => sku.id === activeSkuId) ?? null,
    [activeSkuId, skus]
  );
  const modalSku = mode === "edit" ? activeSku : null;

  useEffect(() => {
    if (!modalOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modalOpen]);

  function openNew() {
    setMode("new");
    setActiveSkuId(null);
    setModalError("");
    setDisplayName("");
    setUnitTypeValue("UNIDADE");
    setPriceValue("");
    setIsActiveValue(true);
    setFieldErrors({});
    setAttributeRows(getInitialAttributes(null));
    setShowAttributeError(false);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    const nextSku = skus.find((sku) => sku.id === id) ?? null;
    setMode("edit");
    setActiveSkuId(id);
    setModalError("");
    setDisplayName(nextSku?.displayName ?? "");
    setUnitTypeValue(nextSku?.unitType ?? "UNIDADE");
    setPriceValue(
      nextSku?.priceCurrent ? formatPriceForDisplay(nextSku.priceCurrent) : ""
    );
    setIsActiveValue(nextSku?.isActive ?? true);
    setFieldErrors({});
    setAttributeRows(getInitialAttributes(nextSku));
    setShowAttributeError(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  const activeSkuCount = useMemo(
    () => skus.filter((sku) => sku.isActive).length,
    [skus]
  );

  const attributeValidation = useMemo(
    () => validateSkuAttributes(attributeRows),
    [attributeRows]
  );
  const duplicateAttributeKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of attributeRows) {
      const normalized = normalizeKey(row.key);
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
    const duplicates = new Set<string>();
    for (const [key, count] of counts) {
      if (count > 1) {
        duplicates.add(key);
      }
    }
    return duplicates;
  }, [attributeRows]);
  const attributesJsonValue = attributeValidation.ok
    ? attributeValidation.json
    : JSON.stringify(attributeRows);
  const filledAttributeCount = useMemo(
    () =>
      attributeRows.filter(
        (row) => row.key.trim() !== "" || row.value.trim() !== ""
      ).length,
    [attributeRows]
  );
  const attributesError = useMemo(() => {
    if (attributeValidation.ok) return "";
    const message =
      attributeValidation.message ?? attributeValidation.error;
    if (attributeValidation.error === "atributos_duplicados") {
      return message;
    }
    return showAttributeError ? message : "";
  }, [attributeValidation, showAttributeError]);
  const hasDuplicateAttributes =
    !attributeValidation.ok &&
    attributeValidation.error === "atributos_duplicados";
  const filteredSkus = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return skus.filter((sku) => {
      if (statusFilter === "active" && !sku.isActive) return false;
      if (statusFilter === "inactive" && sku.isActive) return false;
      if (query && !sku.displayName.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [searchText, skus, statusFilter]);

  function updateAttributeRow(
    index: number,
    field: "key" | "value",
    value: string
  ) {
    setAttributeRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  }

  function addAttributeRow() {
    setAttributeRows((prev) =>
      prev.length >= maxAttributes ? prev : [...prev, createEmptyAttribute()]
    );
  }

  function removeAttributeRow(index: number) {
    setAttributeRows((prev) => {
      const next = prev.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [createEmptyAttribute()];
    });
  }

  const formValues: SkuFormValues = {
    displayName,
    unitType: unitTypeValue,
    price: priceValue,
  };
  const validationState = validateSkuFormValues(formValues);
  const isFormValid = validationState.ok && !hasDuplicateAttributes;

  function focusFirstError(nextErrors: SkuFormErrors) {
    if (nextErrors.displayName) {
      nameInputRef.current?.focus();
      return;
    }
    if (nextErrors.unitType) {
      unitTypeSelectRef.current?.querySelector('button')?.focus();
      return;
    }
    if (nextErrors.price) {
      priceRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const validation = validateSkuAttributes(attributeRows);
    if (!validation.ok) {
      event.preventDefault();
      setShowAttributeError(true);
      return;
    }
    const result = validateSkuFormValues(formValues);
    if (!result.ok) {
      event.preventDefault();
      setFieldErrors(result.errors);
      setShowAttributeError(false);
      focusFirstError(result.errors);
      return;
    }
    setFieldErrors({});
    setShowAttributeError(false);
  }

  const modalTitle = mode === "edit" ? "Editar SKU" : "Novo SKU";

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>SKUs</h2>
        <button
          type="button"
          onClick={openNew}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          + Novo SKU
        </button>
      </div>
      <div className={styles.panelBody}>
        {showReadyNotice ? (
          <InlineNotice tone="success" clearQueryKeys={["ready"]}>
            Pronto para usar em pedidos.
          </InlineNotice>
        ) : null}
        {activeSkuCount === 0 ? (
          <div className={`${styles.notice} ${styles.noticeWarning}`}>
            Produto criado. Adicione pelo menos 1 SKU para usar em pedidos.
            <button
              type="button"
              onClick={openNew}
              className={`${styles.button} ${styles.buttonSm} ${styles.buttonGhost}`}
            >
              + Novo SKU
            </button>
          </div>
        ) : null}
        {skus.length === 0 ? (
          <div className={styles.emptyState}>Nenhum SKU cadastrado.</div>
        ) : (
          <>
            <div className={detailStyles.skuFilters}>
              <input
                type="search"
                placeholder="Buscar por nome"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className={`${styles.control} ${detailStyles.skuFilterInput}`}
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | "active" | "inactive"
                  )
                }
                className={`${styles.control} ${detailStyles.skuFilterSelect}`}
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
            {filteredSkus.length === 0 ? (
              <div className={styles.emptyState}>Nenhum SKU encontrado.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Unidade</th>
                      <th className={styles.tableNumeric}>Preco</th>
                      <th>Status</th>
                      <th className={styles.tableActions}>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkus.map((sku) => {
                      const nextActive = !sku.isActive;
                      const attributePreview = sku.attributes.slice(0, 3);
                      const attributeExtra =
                        sku.attributes.length - attributePreview.length;
                      const attributesTitle = sku.attributes
                        .map((attr) => `${attr.key}: ${attr.value}`)
                        .join(" | ");
                      return (
                        <tr key={sku.id}>
                          <td>
                            <div className={detailStyles.skuMeta}>
                              <strong>{sku.displayName}</strong>
                              <div
                                className={detailStyles.skuSubline}
                                title={attributesTitle}
                              >
                                {sku.attributes.length ? (
                                  <div className={detailStyles.attributeBadges}>
                                    {attributePreview.map((attr, index) => (
                                      <span
                                        key={`${sku.id}-attr-${index}`}
                                        className={`${styles.badge} ${styles.badgeNeutral}`}
                                      >
                                        {attr.key}: {attr.value}
                                      </span>
                                    ))}
                                    {attributeExtra > 0 ? (
                                      <span
                                        className={`${styles.badge} ${styles.badgeNeutral}`}
                                      >
                                        +{attributeExtra}
                                      </span>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className={styles.textMuted}>
                                    Sem atributos
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            {sku.unitType} ({sku.unitLabel})
                          </td>
                          <td className={styles.tableNumeric}>
                            R$ {sku.priceCurrent.toFixed(2)}
                          </td>
                          <td>{sku.isActive ? "ATIVO" : "INATIVO"}</td>
                          <td className={styles.tableActions}>
                            <div className={styles.clusterSm}>
                              <button
                                type="button"
                                onClick={() => openEdit(sku.id)}
                                className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                              >
                                Editar
                              </button>
                              <form action={duplicateSkuAction}>
                                <input
                                  type="hidden"
                                  name="productId"
                                  value={productId}
                                />
                                <input
                                  type="hidden"
                                  name="skuId"
                                  value={sku.id}
                                />
                                <button
                                  type="submit"
                                  className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                                >
                                  Duplicar
                                </button>
                              </form>
                              <form action={updateSkuAction}>
                                <input
                                  type="hidden"
                                  name="productId"
                                  value={productId}
                                />
                                <input
                                  type="hidden"
                                  name="skuId"
                                  value={sku.id}
                                />
                                <input
                                  type="hidden"
                                  name="displayName"
                                  value={sku.displayName}
                                />
                                <input
                                  type="hidden"
                                  name="sizeText"
                                  value={sku.sizeText}
                                />
                                <input
                                  type="hidden"
                                  name="flavorText"
                                  value={sku.flavorText}
                                />
                                {sku.isFrozen ? (
                                  <input
                                    type="hidden"
                                    name="isFrozen"
                                    value="on"
                                  />
                                ) : null}
                                <input
                                  type="hidden"
                                  name="unitType"
                                  value={sku.unitType}
                                />
                                <input
                                  type="hidden"
                                  name="priceCurrent"
                                  value={String(sku.priceCurrent)}
                                />
                                <input
                                  type="hidden"
                                  name="cost"
                                  value={
                                    sku.cost !== null ? String(sku.cost) : ""
                                  }
                                />
                                <input
                                  type="hidden"
                                  name="tags"
                                  value={sku.tags.join(", ")}
                                />
                                <input
                                  type="hidden"
                                  name="attributesJson"
                                  value={sku.attributesJson ?? ""}
                                />
                                {nextActive ? (
                                  <input
                                    type="hidden"
                                    name="isActive"
                                    value="on"
                                  />
                                ) : null}
                                <button
                                  type="submit"
                                  className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                                >
                                  {nextActive ? "Ativar" : "Desativar"}
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen ? (
        <div
          className={detailStyles.modalOverlay}
          onClick={() => setModalOpen(false)}
        >
          <div
            className={detailStyles.modalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={detailStyles.modalHeader}>
              <h3 className={detailStyles.modalTitle}>{modalTitle}</h3>
              <button
                type="button"
                onClick={closeModal}
                className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
              >
                Fechar
              </button>
            </div>

            {modalError ? (
              <div className={`${styles.notice} ${styles.noticeError}`}>
                {modalError}
              </div>
            ) : null}

            <form
              action={mode === "edit" ? updateSkuAction : createSkuAction}
              className={detailStyles.skuModalForm}
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="productId" value={productId} />
              {mode === "edit" && modalSku ? (
                <input type="hidden" name="skuId" value={modalSku.id} />
              ) : null}
              {!modalSku && mode === "edit" ? (
                <p className={styles.textError}>SKU nao encontrado.</p>
              ) : null}
              <label className={`${styles.field} ${styles.fieldFull}`}>
                Nome exibido
                <input
                  ref={nameInputRef}
                  name="displayName"
                  placeholder="Nome exibido"
                  required
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    if (fieldErrors.displayName) {
                      setFieldErrors((prev) => ({ ...prev, displayName: "" }));
                    }
                  }}
                  className={`${styles.control} ${detailStyles.skuNameInput}`}
                  aria-invalid={Boolean(fieldErrors.displayName)}
                />
                {fieldErrors.displayName ? (
                  <span className={styles.textError}>
                    {fieldErrors.displayName}
                  </span>
                ) : null}
              </label>
              {mode === "edit" && modalSku ? (
                <>
                  <input
                    type="hidden"
                    name="sizeText"
                    value={modalSku.sizeText}
                  />
                  <input
                    type="hidden"
                    name="flavorText"
                    value={modalSku.flavorText}
                  />
                </>
              ) : null}
              <div className={detailStyles.skuRequiredRow}>
                <label className={styles.field}>
                  Tipo de venda
                  <Select
                    name="unitType"
                    options={unitTypeOptions.map((opt) => ({
                      value: opt.value,
                      label: opt.label,
                    }))}
                    value={unitTypeValue}
                    onChange={(value) => {
                      setUnitTypeValue(value);
                      if (fieldErrors.unitType) {
                        setFieldErrors((prev) => ({ ...prev, unitType: "" }));
                      }
                    }}
                    variant={fieldErrors.unitType ? "error" : "default"}
                    aria-invalid={Boolean(fieldErrors.unitType)}
                    aria-label="Tipo de venda"
                    containerRef={unitTypeSelectRef}
                  />
                  {fieldErrors.unitType ? (
                    <span className={styles.textError}>
                      {fieldErrors.unitType}
                    </span>
                  ) : null}
                </label>
                <label className={styles.field}>
                  Preco atual
                  <div className={styles.moneyInputWrapper}>
                    <span className={styles.moneyPrefix}>R$</span>
                    <input
                      ref={priceRef}
                      type="text"
                      inputMode="decimal"
                      required
                      value={priceValue}
                      onChange={(event) => {
                        const formatted = formatPriceInput(event.target.value);
                        setPriceValue(formatted);
                        if (fieldErrors.price) {
                          setFieldErrors((prev) => ({ ...prev, price: "" }));
                        }
                      }}
                    onBlur={(event) => {
                      const formatted = formatPriceInput(event.target.value);
                      setPriceValue(formatted);
                    }}
                      className={`${styles.control} ${styles.moneyInput}`}
                      aria-invalid={Boolean(fieldErrors.price)}
                    />
                  </div>
                  <input
                    type="hidden"
                    name="priceCurrent"
                    value={priceValue ? parsePriceFromDisplay(priceValue).toFixed(2) : ""}
                  />
                  {fieldErrors.price ? (
                    <span className={styles.textError}>
                      {fieldErrors.price}
                    </span>
                  ) : null}
                </label>
              </div>
              <div className={`${styles.switchRow} ${detailStyles.skuActiveRow}`}>
                <Switch
                  checked={isActiveValue}
                  onChange={setIsActiveValue}
                  label="Ativo"
                  aria-label="SKU ativo"
                  id={`sku-active-switch-${initialSkuId || "new"}`}
                />
                {isActiveValue ? (
                  <input
                    type="hidden"
                    name="isActive"
                    value="on"
                  />
                ) : null}
              </div>
              <details className={detailStyles.skuAdvanced}>
                <summary className={detailStyles.skuAdvancedSummary}>
                  Avancado (opcional)
                </summary>
                <div className={detailStyles.skuAdvancedBody}>
                  <div className={detailStyles.skuRequiredRow}>
                    <label className={styles.field}>
                      Custo (opcional)
                      <input
                        type="number"
                        name="cost"
                        step="0.01"
                        defaultValue={
                          modalSku && modalSku.cost !== null
                            ? String(modalSku.cost)
                            : ""
                        }
                        className={styles.control}
                      />
                    </label>
                    <label className={styles.field}>
                      Tags (separadas por virgula)
                      <input
                        name="tags"
                        placeholder="salgado, festa"
                        defaultValue={modalSku?.tags.join(", ") ?? ""}
                        className={styles.control}
                      />
                    </label>
                  </div>
                  <div className={styles.fieldFull}>
                    <div className={detailStyles.attributeHeader}>
                      <div>
                        <div className={detailStyles.attributeTitle}>Atributos</div>
                        <div className={styles.textMuted}>
                          Ex.: sabor=frango, tamanho=160g (o sistema padroniza automaticamente)
                        </div>
                      </div>
                      <span className={detailStyles.attributeCount}>
                        {filledAttributeCount}/{maxAttributes}
                      </span>
                    </div>
                    <div className={detailStyles.attributeList}>
                      {attributeRows.map((row, index) => {
                        const normalizedKey = normalizeKey(row.key);
                        const isDuplicate =
                          Boolean(normalizedKey) &&
                          duplicateAttributeKeys.has(normalizedKey);
                        return (
                          <div
                            key={`attr-${index}`}
                            className={`${detailStyles.attributeRow} ${
                              isDuplicate ? detailStyles.attributeRowError : ""
                            }`}
                          >
                            <input
                              name={`attribute-key-${index}`}
                              placeholder="atributo"
                              value={row.key}
                              onChange={(event) =>
                                updateAttributeRow(index, "key", event.target.value)
                              }
                              className={styles.control}
                            />
                            <input
                              name={`attribute-value-${index}`}
                              placeholder="valor"
                              value={row.value}
                              onChange={(event) =>
                                updateAttributeRow(
                                  index,
                                  "value",
                                  event.target.value
                                )
                              }
                              ref={(element) => {
                                valueInputRefs.current[index] = element;
                              }}
                              className={styles.control}
                            />
                            <button
                              type="button"
                              onClick={() => removeAttributeRow(index)}
                              className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                            >
                              Remover
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className={detailStyles.attributeFooter}>
                      <button
                        type="button"
                        onClick={addAttributeRow}
                        disabled={attributeRows.length >= maxAttributes}
                        className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                      >
                        Adicionar atributo
                      </button>
                      {attributesError ? (
                        <span className={styles.textError}>{attributesError}</span>
                      ) : null}
                    </div>
                    <input
                      type="hidden"
                      name="attributesJson"
                      value={attributesJsonValue}
                    />
                  </div>
                </div>
              </details>

              <SkuFormActions
                onCancel={closeModal}
                disableSave={!isFormValid}
              />
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
