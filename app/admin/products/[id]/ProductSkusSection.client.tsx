"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  normalizeKey,
  validateSkuAttributes,
  type SkuAttributeInput,
} from "@/lib/validation/skuAttributes";
import styles from "../../_styles/adminPrimitives.module.css";
import detailStyles from "./productDetail.module.css";
import { generateSkuDisplayName } from "./skuName";

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
  sobConsultaOverride: boolean | null;
  tags: string[];
};

type SkuFormMode = "new" | "edit";

type ProductSkusSectionProps = {
  productId: string;
  productName: string;
  productSobConsulta: boolean;
  skus: SkuView[];
  createSkuAction: (formData: FormData) => void;
  updateSkuAction: (formData: FormData) => void;
  duplicateSkuAction: (formData: FormData) => void;
  initialMode?: SkuFormMode;
  initialSkuId?: string | null;
  skuErrorMessage?: string;
};

const unitTypeOptions = [
  { value: "UNIDADE", label: "UNIDADE" },
  { value: "CENTO", label: "CENTO" },
  { value: "KG", label: "KG" },
];

const maxAttributes = 15;
const maxSkuNameLength = 90;
const attributeSuggestions = [
  "sabor",
  "tamanho",
  "cor",
  "modelo",
  "tipo",
  "fragrancia",
  "peso",
  "volume",
];

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
  productName,
  productSobConsulta,
  skus,
  createSkuAction,
  updateSkuAction,
  duplicateSkuAction,
  initialMode,
  initialSkuId,
  skuErrorMessage,
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
  const [displayName, setDisplayName] = useState(
    () => initialSku?.displayName ?? ""
  );
  const [attributeRows, setAttributeRows] = useState<SkuAttributeInput[]>(
    () => getInitialAttributes(initialSku)
  );
  const [showAttributeError, setShowAttributeError] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const valueInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const pendingFocusIndex = useRef<number | null>(null);

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

  useEffect(() => {
    const targetIndex = pendingFocusIndex.current;
    if (targetIndex === null) return;
    const target = valueInputRefs.current[targetIndex];
    if (target) {
      target.focus();
    }
    pendingFocusIndex.current = null;
  }, [attributeRows]);

  function openNew() {
    setMode("new");
    setActiveSkuId(null);
    setModalError("");
    setDisplayName("");
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
    setAttributeRows(getInitialAttributes(nextSku));
    setShowAttributeError(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function renderSobConsultaLabel(sku: SkuView) {
    if (sku.sobConsultaOverride === true) return "SIM";
    if (sku.sobConsultaOverride === false) return "NAO";
    return productSobConsulta ? "SIM" : "NAO";
  }

  const attributeValidation = useMemo(
    () => validateSkuAttributes(attributeRows),
    [attributeRows]
  );
  const existingAttributeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of attributeRows) {
      const normalized = normalizeKey(row.key);
      if (normalized) {
        keys.add(normalized);
      }
    }
    return keys;
  }, [attributeRows]);
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

  function handleSuggestionClick(suggestion: string) {
    const normalized = normalizeKey(suggestion);
    if (!normalized || existingAttributeKeys.has(normalized)) {
      return;
    }
    setAttributeRows((prev) => {
      let targetIndex = prev.findIndex(
        (row) => !row.key.trim() && !row.value.trim()
      );
      if (targetIndex === -1) {
        if (prev.length >= maxAttributes) {
          return prev;
        }
        targetIndex = prev.length;
        pendingFocusIndex.current = targetIndex;
        return [
          ...prev,
          {
            key: suggestion,
            value: "",
          },
        ];
      }
      const next = [...prev];
      next[targetIndex] = { ...next[targetIndex], key: suggestion };
      pendingFocusIndex.current = targetIndex;
      return next;
    });
  }

  function handleGenerateName() {
    if (displayName.trim()) return;
    const generated = generateSkuDisplayName(
      productName,
      attributeRows,
      maxSkuNameLength
    );
    if (!generated) return;
    setDisplayName(generated);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const validation = validateSkuAttributes(attributeRows);
    if (!validation.ok) {
      event.preventDefault();
      setShowAttributeError(true);
      return;
    }
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
                      <th>Sob consulta</th>
                      <th className={styles.tableActions}>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSkus.map((sku) => {
                      const nextActive = !sku.isActive;
                      const sobValue =
                        sku.sobConsultaOverride === true
                          ? "true"
                          : sku.sobConsultaOverride === false
                          ? "false"
                          : "inherit";
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
                          <td>{renderSobConsultaLabel(sku)}</td>
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
                                  name="unitLabel"
                                  value={sku.unitLabel}
                                />
                                <input
                                  type="hidden"
                                  name="quantityStep"
                                  value={String(sku.quantityStep)}
                                />
                                <input
                                  type="hidden"
                                  name="minQty"
                                  value={String(sku.minQty)}
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
                                  name="sobConsultaOverride"
                                  value={sobValue}
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
              className={styles.formGrid}
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="productId" value={productId} />
              {mode === "edit" && modalSku ? (
                <input type="hidden" name="skuId" value={modalSku.id} />
              ) : null}
              {!modalSku && mode === "edit" ? (
                <p className={styles.textError}>SKU nao encontrado.</p>
              ) : null}
              <div className={`${detailStyles.skuNameRow} ${styles.fieldFull}`}>
                <input
                  name="displayName"
                  placeholder="Nome exibido"
                  required
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className={`${styles.control} ${detailStyles.skuNameInput}`}
                />
                <button
                  type="button"
                  onClick={handleGenerateName}
                  disabled={displayName.trim() !== ""}
                  className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                >
                  Gerar nome
                </button>
              </div>
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
              <label className={styles.choiceRow}>
                <input
                  type="checkbox"
                  name="isFrozen"
                  defaultChecked={modalSku?.isFrozen ?? false}
                />
                <span className={styles.choiceLabel}>Congelado</span>
              </label>
              <label className={styles.field}>
                Tipo de venda
                <select
                  name="unitType"
                  defaultValue={modalSku?.unitType ?? "UNIDADE"}
                  className={styles.control}
                >
                  {unitTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <input
                name="unitLabel"
                placeholder="un/cento/kg/kit"
                required
                defaultValue={modalSku?.unitLabel ?? ""}
                className={styles.control}
              />
              <label className={styles.field}>
                Passo de quantidade
                <input
                  type="number"
                  name="quantityStep"
                  step="0.1"
                  required
                  defaultValue={
                    modalSku ? String(modalSku.quantityStep) : ""
                  }
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                Minimo
                <input
                  type="number"
                  name="minQty"
                  step="0.1"
                  required
                  defaultValue={modalSku ? String(modalSku.minQty) : ""}
                  className={styles.control}
                />
              </label>
              <label className={styles.field}>
                Preco atual
                <input
                  type="number"
                  name="priceCurrent"
                  step="0.01"
                  required
                  defaultValue={
                    modalSku ? String(modalSku.priceCurrent) : ""
                  }
                  className={styles.control}
                />
              </label>
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
              <div className={styles.fieldFull}>
                <div className={detailStyles.attributeHeader}>
                  <div>
                    <div className={detailStyles.attributeTitle}>Atributos</div>
                    <div className={styles.textMuted}>
                      Opcional. Chaves sao normalizadas.
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
                <div className={detailStyles.attributeSuggestions}>
                  <span className={styles.textMuted}>Sugestoes:</span>
                  <div className={detailStyles.attributeChips}>
                    {attributeSuggestions.map((suggestion) => {
                      const normalized = normalizeKey(suggestion);
                      const disabled =
                        !normalized ||
                        existingAttributeKeys.has(normalized) ||
                        filledAttributeCount >= maxAttributes;
                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          disabled={disabled}
                          className={detailStyles.attributeChip}
                        >
                          {suggestion}
                        </button>
                      );
                    })}
                  </div>
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
              <label className={styles.field}>
                Sob consulta
                <select
                  name="sobConsultaOverride"
                  defaultValue={
                    modalSku?.sobConsultaOverride === true
                      ? "true"
                      : modalSku?.sobConsultaOverride === false
                      ? "false"
                      : "inherit"
                  }
                  className={styles.control}
                >
                  <option value="inherit">Herdar do produto</option>
                  <option value="true">Forcar sob consulta</option>
                  <option value="false">Forcar nao</option>
                </select>
              </label>
              <label className={styles.choiceRow}>
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={modalSku?.isActive ?? true}
                />
                <span className={styles.choiceLabel}>Ativo</span>
              </label>

              <SkuFormActions
                onCancel={closeModal}
                disableSave={hasDuplicateAttributes}
              />
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
