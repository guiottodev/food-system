"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { type SkuAttributeInput } from "@/lib/validation/skuAttributes";
import {
  formatSkuPriceInput,
  normalizeSkuPriceInput,
  parseSkuPriceInput,
  validateSkuFormValues,
  type SkuFormErrors,
  type SkuFormValues,
} from "@/lib/skuFormValidation";
import {
  formatDecimalDisplay,
  getUnitPriceDecimals,
  parseDecimalInput,
} from "@/lib/price";
import { formatSkuLabel } from "@/lib/normalization";
import Select from "../../_components/Select";
import Switch from "../../_components/Switch";
import styles from "../../_styles/adminPrimitives.module.css";
import detailStyles from "./productDetail.module.css";
import { InlineNotice } from "../../design-system/InlineNotice.client";

type SkuView = {
  id: string;
  displayName: string;
  referencia?: string | null;
  sizeText: string;
  flavorText: string;
  attributes: SkuAttributeInput[];
  attributesJson: string | null;
  catalogAttributes: CatalogAttributeSelection[];
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

type CatalogAttributeValue = {
  id: string;
  value: string;
};

type CatalogAttribute = {
  id: string;
  name: string;
  isActive: boolean;
  type: "TEXTO" | "NUMERO" | "LISTA";
  unit: string | null;
  values: CatalogAttributeValue[];
};

type CatalogAttributeSelection = {
  atributoId: string;
  atributoValorId: string | null;
  valueText: string | null;
};

type CatalogAttributeRow = {
  atributoId: string;
  atributoValorId: string;
  valueText: string;
};

type SkuFormMode = "new" | "edit";

type ProductSkusSectionProps = {
  productId: string;
  skus: SkuView[];
  catalogAttributes: CatalogAttribute[];
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
const EMPTY_CATALOG_ATTRIBUTES: CatalogAttribute[] = [];

function createEmptyCatalogRow(): CatalogAttributeRow {
  return { atributoId: "", atributoValorId: "", valueText: "" };
}

function getInitialCatalogRows(sku: SkuView | null): CatalogAttributeRow[] {
  if (sku?.catalogAttributes?.length) {
    return sku.catalogAttributes.map((attr) => ({
      atributoId: attr.atributoId,
      atributoValorId: attr.atributoValorId ?? "",
      valueText: attr.valueText ?? "",
    }));
  }
  return [createEmptyCatalogRow()];
}

function isCatalogRowEmpty(row: CatalogAttributeRow) {
  return (
    !row.atributoId.trim() &&
    !row.atributoValorId.trim() &&
    !row.valueText.trim()
  );
}

function validateCatalogRows(
  rows: CatalogAttributeRow[],
  attributeMap: Map<string, CatalogAttribute>
) {
  const duplicates = new Set<string>();
  const seen = new Set<string>();
  let error = "";

  for (const row of rows) {
    if (isCatalogRowEmpty(row)) continue;
    const atributoId = row.atributoId.trim();
    if (!atributoId) {
      error = "Selecione um atributo valido.";
      break;
    }
    if (seen.has(atributoId)) {
      duplicates.add(atributoId);
      error = "Cada atributo deve ser unico.";
      continue;
    }
    seen.add(atributoId);
    const attribute = attributeMap.get(atributoId);
    if (!attribute) {
      error = "Selecione um atributo valido.";
      break;
    }
    if (attribute.type === "LISTA") {
      if (!row.atributoValorId.trim()) {
        error = "Selecione um valor para o atributo.";
      }
    } else if (!row.valueText.trim()) {
      error = "Preencha o valor do atributo.";
    }
    if (error) break;
  }

  return { ok: !error, error, duplicates };
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
  catalogAttributes,
  createSkuAction,
  updateSkuAction,
  duplicateSkuAction,
  initialMode,
  initialSkuId,
  skuErrorMessage,
  showReadyNotice = false,
}: ProductSkusSectionProps) {
  const safeCatalogAttributes = catalogAttributes ?? EMPTY_CATALOG_ATTRIBUTES;
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
  const formatPriceForDisplay = (value: number, unitTypeValue: string): string => {
    return formatDecimalDisplay(value, getUnitPriceDecimals(unitTypeValue));
  };

  const [priceValue, setPriceValue] = useState(() =>
    initialSku
      ? formatPriceForDisplay(initialSku.priceCurrent, initialSku.unitType)
      : ""
  );
  const [referenceValue, setReferenceValue] = useState(
    () => initialSku?.referencia ?? ""
  );
  const [isActiveValue, setIsActiveValue] = useState(
    () => initialSku?.isActive ?? true
  );
  const [fieldErrors, setFieldErrors] = useState<SkuFormErrors>({});
  const [unitChangeNotice, setUnitChangeNotice] = useState("");
  const unitTypeSelectRef = useRef<HTMLDivElement | null>(null);
  const [catalogRows, setCatalogRows] = useState<CatalogAttributeRow[]>(
    () => getInitialCatalogRows(initialSku)
  );
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const priceRef = useRef<HTMLInputElement | null>(null);
  const costRef = useRef<HTMLInputElement | null>(null);

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
    setReferenceValue("");
    setIsActiveValue(true);
    setFieldErrors({});
    setCatalogRows(getInitialCatalogRows(null));
    setUnitChangeNotice("");
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
      nextSku?.priceCurrent !== undefined && nextSku?.priceCurrent !== null
        ? formatPriceForDisplay(
            nextSku.priceCurrent,
            nextSku.unitType ?? "UNIDADE"
          )
        : ""
    );
    setReferenceValue(nextSku?.referencia ?? "");
    setIsActiveValue(nextSku?.isActive ?? true);
    setFieldErrors({});
    setCatalogRows(getInitialCatalogRows(nextSku));
    setUnitChangeNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  const activeSkuCount = useMemo(
    () => skus.filter((sku) => sku.isActive).length,
    [skus]
  );

  const attributeMap = useMemo(
    () =>
      new Map(
        (catalogAttributes ?? EMPTY_CATALOG_ATTRIBUTES).map((attr) => [attr.id, attr])
      ),
    [catalogAttributes]
  );
  const hasActiveAttributes = useMemo(
    () =>
      (catalogAttributes ?? EMPTY_CATALOG_ATTRIBUTES).some((attr) => attr.isActive),
    [catalogAttributes]
  );
  const useLegacyAttributes =
    Boolean(modalSku?.attributesJson) &&
    (modalSku?.catalogAttributes?.length ?? 0) === 0;
  const catalogValidation = useMemo(
    () => validateCatalogRows(catalogRows, attributeMap),
    [catalogRows, attributeMap]
  );
  const filledAttributeCount = useMemo(
    () => catalogRows.filter((row) => !isCatalogRowEmpty(row)).length,
    [catalogRows]
  );
  const attributesError = useMemo(() => {
    if (useLegacyAttributes) return "";
    return catalogValidation.ok ? "" : catalogValidation.error;
  }, [catalogValidation, useLegacyAttributes]);
  const hasDuplicateAttributes =
    !useLegacyAttributes && catalogValidation.duplicates.size > 0;
  const attributesCatalogValue = useMemo(
    () =>
      JSON.stringify(
        catalogRows.map((row) => ({
          atributoId: row.atributoId,
          atributoValorId: row.atributoValorId || null,
          valueText: row.valueText || null,
        }))
      ),
    [catalogRows]
  );
  const filteredSkus = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return skus.filter((sku) => {
      if (statusFilter === "active" && !sku.isActive) return false;
      if (statusFilter === "inactive" && sku.isActive) return false;
      if (query) {
        const nameMatch = sku.displayName.toLowerCase().includes(query);
        const refMatch = sku.referencia
          ? sku.referencia.toLowerCase().includes(query)
          : false;
        if (!nameMatch && !refMatch) return false;
      }
      return true;
    });
  }, [searchText, skus, statusFilter]);

  function updateCatalogRow(
    index: number,
    field: keyof CatalogAttributeRow,
    value: string
  ) {
    setCatalogRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  }

  function addCatalogRow() {
    setCatalogRows((prev) =>
      prev.length >= maxAttributes ? prev : [...prev, createEmptyCatalogRow()]
    );
  }

  function removeCatalogRow(index: number) {
    setCatalogRows((prev) => {
      const next = prev.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [createEmptyCatalogRow()];
    });
  }

  const formValues: SkuFormValues = {
    displayName,
    unitType: unitTypeValue,
    price: priceValue,
  };
  const validationState = validateSkuFormValues(formValues);
  const isFormValid =
    validationState.ok &&
    !hasDuplicateAttributes &&
    (useLegacyAttributes || catalogValidation.ok);

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
    if (!useLegacyAttributes && !catalogValidation.ok) {
      event.preventDefault();
      return;
    }
    const result = validateSkuFormValues(formValues);
    if (!result.ok) {
      event.preventDefault();
      setFieldErrors(result.errors);
      focusFirstError(result.errors);
      return;
    }
    setFieldErrors({});
  }

  function handleUnitTypeChange(nextValue: string) {
    if (nextValue === unitTypeValue) return;
    const prevUnitType = unitTypeValue;
    const prevDecimals = getUnitPriceDecimals(prevUnitType);
    const nextDecimals = getUnitPriceDecimals(nextValue);
    const parsedPrice = parseSkuPriceInput(priceValue, prevUnitType);
    if (parsedPrice) {
      setPriceValue(formatDecimalDisplay(parsedPrice.value, nextDecimals));
    }
    const rawCost = costRef.current?.value ?? "";
    const parsedCost = parseDecimalInput(rawCost, prevDecimals);
    if (parsedCost && costRef.current) {
      costRef.current.value = formatDecimalDisplay(
        parsedCost.value,
        nextDecimals
      );
    }
    if (prevDecimals > nextDecimals) {
      setUnitChangeNotice("O preco foi ajustado para 2 casas decimais.");
    } else {
      setUnitChangeNotice("");
    }
    setUnitTypeValue(nextValue);
    if (fieldErrors.unitType) {
      setFieldErrors((prev) => ({ ...prev, unitType: "" }));
    }
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
                placeholder="Buscar por nome ou referencia"
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
                              <strong>{formatSkuLabel(sku.displayName, sku.referencia)}</strong>
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
                            R$ {formatDecimalDisplay(sku.priceCurrent, getUnitPriceDecimals(sku.unitType))}
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
                                  name="referencia"
                                  value={sku.referencia ?? ""}
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
                                <input
                                  type="hidden"
                                  name="attributesMode"
                                  value="legacy"
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
              <label className={styles.field}>
                Referencia (opcional)
                <input
                  name="referencia"
                  placeholder="Ex.: 123ABC"
                  value={referenceValue}
                  maxLength={50}
                  onChange={(event) => setReferenceValue(event.target.value)}
                  className={styles.control}
                />
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
                    onChange={handleUnitTypeChange}
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
                        const formatted = normalizeSkuPriceInput(
                          event.target.value,
                          unitTypeValue
                        );
                        setPriceValue(formatted);
                        if (fieldErrors.price) {
                          setFieldErrors((prev) => ({ ...prev, price: "" }));
                        }
                      }}
                    onBlur={(event) => {
                      const formatted = formatSkuPriceInput(
                        event.target.value,
                        unitTypeValue
                      );
                      setPriceValue(formatted);
                    }}
                      className={`${styles.control} ${styles.moneyInput}`}
                      aria-invalid={Boolean(fieldErrors.price)}
                      placeholder={getUnitPriceDecimals(unitTypeValue) === 4 ? "0,0000" : "0,00"}
                    />
                  </div>
                  <input
                    type="hidden"
                    name="priceCurrent"
                    value={
                      priceValue
                        ? parseSkuPriceInput(priceValue, unitTypeValue)?.value.toFixed(
                            getUnitPriceDecimals(unitTypeValue)
                          ) ?? ""
                        : ""
                    }
                  />
                  {unitChangeNotice ? (
                    <span className={styles.textMuted}>{unitChangeNotice}</span>
                  ) : null}
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
                        ref={costRef}
                        type="text"
                        inputMode="decimal"
                        name="cost"
                        defaultValue={
                          modalSku && modalSku.cost !== null
                            ? formatDecimalDisplay(
                                Number(modalSku.cost),
                                getUnitPriceDecimals(unitTypeValue)
                              )
                            : ""
                        }
                        onBlur={(event) => {
                          const parsed = parseDecimalInput(
                            event.target.value,
                            getUnitPriceDecimals(unitTypeValue)
                          );
                          if (parsed) {
                            event.target.value = formatDecimalDisplay(
                              parsed.value,
                              getUnitPriceDecimals(unitTypeValue)
                            );
                          }
                        }}
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
                          Use atributos do catalogo para padronizar os SKUs.
                        </div>
                      </div>
                      <span className={detailStyles.attributeCount}>
                        {filledAttributeCount}/{maxAttributes}
                      </span>
                    </div>
                    {safeCatalogAttributes.length === 0 ? (
                      <div className={styles.textMuted}>
                        Nenhum atributo cadastrado.{" "}
                        <Link href="/admin/configuracoes">Ir para Configuracoes</Link>
                      </div>
                    ) : useLegacyAttributes ? (
                      <div className={detailStyles.attributeList}>
                        <div className={styles.textMuted}>
                          Atributos legados (somente leitura).
                        </div>
                        {modalSku?.attributes.length ? (
                          <div className={detailStyles.attributeBadges}>
                            {modalSku.attributes.map((attr, index) => (
                              <span
                                key={`${modalSku.id}-legacy-${index}`}
                                className={`${styles.badge} ${styles.badgeNeutral}`}
                              >
                                {attr.key}: {attr.value}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={styles.textMuted}>Sem atributos</span>
                        )}
                      </div>
                    ) : (
                      <div className={detailStyles.attributeList}>
                        {!hasActiveAttributes ? (
                          <div className={styles.textMuted}>
                            Nenhum atributo ativo. Ative em Configuracoes para adicionar novos.
                          </div>
                        ) : null}
                        {catalogRows.map((row, index) => {
                          const attribute = attributeMap.get(row.atributoId);
                          const isDuplicate =
                            Boolean(row.atributoId) &&
                            catalogValidation.duplicates.has(row.atributoId);
                          const valueOptions = attribute?.values ?? [];
                          const attributeOptions = [
                            { value: "", label: "Selecione um atributo" },
                            ...safeCatalogAttributes
                              .filter((attr) => attr.isActive || attr.id === row.atributoId)
                              .map((attr) => ({
                                value: attr.id,
                                label: attr.isActive ? attr.name : `${attr.name} (inativo)`,
                              })),
                          ];
                          return (
                            <div
                              key={`attr-${index}`}
                              className={`${detailStyles.attributeRow} ${
                                isDuplicate ? detailStyles.attributeRowError : ""
                              }`}
                            >
                              <Select
                                options={attributeOptions}
                                value={row.atributoId}
                                onChange={(value) => {
                                  updateCatalogRow(index, "atributoId", value);
                                  updateCatalogRow(index, "atributoValorId", "");
                                  updateCatalogRow(index, "valueText", "");
                                }}
                                aria-label="Atributo"
                                className={styles.control}
                              />
                              {attribute?.type === "LISTA" ? (
                                <Select
                                  options={[
                                    { value: "", label: "Selecione um valor" },
                                    ...valueOptions.map((opt) => ({
                                      value: opt.id,
                                      label: opt.value,
                                    })),
                                  ]}
                                  value={row.atributoValorId}
                                  onChange={(value) =>
                                    updateCatalogRow(index, "atributoValorId", value)
                                  }
                                  aria-label="Valor do atributo"
                                  className={styles.control}
                                />
                              ) : (
                                <div className={detailStyles.attributeValueWrap}>
                                  <input
                                    placeholder="valor"
                                    value={row.valueText}
                                    onChange={(event) =>
                                      updateCatalogRow(
                                        index,
                                        "valueText",
                                        event.target.value
                                      )
                                    }
                                    className={styles.control}
                                    inputMode={
                                      attribute?.type === "NUMERO"
                                        ? "decimal"
                                        : "text"
                                    }
                                  />
                                  {attribute?.type === "NUMERO" && attribute.unit ? (
                                    <span className={detailStyles.attributeUnit}>
                                      {attribute.unit}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeCatalogRow(index)}
                                className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                              >
                                Remover
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!useLegacyAttributes && safeCatalogAttributes.length > 0 ? (
                      <div className={detailStyles.attributeFooter}>
                        <button
                          type="button"
                          onClick={addCatalogRow}
                          disabled={catalogRows.length >= maxAttributes}
                          className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                        >
                          Adicionar atributo
                        </button>
                        {attributesError ? (
                          <span className={styles.textError}>{attributesError}</span>
                        ) : null}
                      </div>
                    ) : null}
                    <input
                      type="hidden"
                      name="attributesMode"
                      value={useLegacyAttributes ? "legacy" : "catalog"}
                    />
                    <input
                      type="hidden"
                      name="attributesCatalog"
                      value={attributesCatalogValue}
                    />
                    <input
                      type="hidden"
                      name="attributesJson"
                      value={useLegacyAttributes ? modalSku?.attributesJson ?? "" : ""}
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
