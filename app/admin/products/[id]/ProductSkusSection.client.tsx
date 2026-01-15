"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  validateSkuAttributes,
  type SkuAttributeInput,
} from "@/lib/validation/skuAttributes";
import styles from "../../_styles/adminPrimitives.module.css";
import detailStyles from "./productDetail.module.css";

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
  priceCurrent: number;
  cost: number | null;
  isActive: boolean;
  sobConsultaOverride: boolean | null;
  tags: string[];
};

type SkuFormMode = "new" | "edit";

type ProductSkusSectionProps = {
  productId: string;
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
  { value: "KIT", label: "KIT" },
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

function SkuFormActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
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
        disabled={pending}
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}

export default function ProductSkusSection({
  productId,
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
  const [attributeRows, setAttributeRows] = useState<SkuAttributeInput[]>(
    () => getInitialAttributes(initialSku)
  );
  const [showAttributeError, setShowAttributeError] = useState(false);

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
    setAttributeRows(getInitialAttributes(null));
    setShowAttributeError(false);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    const nextSku = skus.find((sku) => sku.id === id) ?? null;
    setMode("edit");
    setActiveSkuId(id);
    setModalError("");
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
  const attributesError =
    showAttributeError && !attributeValidation.ok
      ? attributeValidation.error
      : "";

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
                {skus.map((sku) => {
                  const nextActive = !sku.isActive;
                  const sobValue =
                    sku.sobConsultaOverride === true
                      ? "true"
                      : sku.sobConsultaOverride === false
                      ? "false"
                      : "inherit";
                  const attributesSummary = sku.attributes.length
                    ? sku.attributes
                        .map((attr) => `${attr.key}: ${attr.value}`)
                        .join(" | ")
                    : "Sem atributos";
                  return (
                    <tr key={sku.id}>
                      <td>
                        <div className={detailStyles.skuMeta}>
                          <strong>{sku.displayName}</strong>
                          <span className={detailStyles.skuSubline}>
                            {attributesSummary}
                          </span>
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
                            <input type="hidden" name="skuId" value={sku.id} />
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
                            <input type="hidden" name="skuId" value={sku.id} />
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
                                  name="priceCurrent"
                                  value={String(sku.priceCurrent)}
                                />
                            <input
                              type="hidden"
                              name="cost"
                              value={sku.cost !== null ? String(sku.cost) : ""}
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
              <input
                name="displayName"
                placeholder="Nome exibido"
                required
                defaultValue={modalSku?.displayName ?? ""}
                className={`${styles.control} ${styles.fieldFull}`}
              />
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
                  {modalSku.isFrozen ? (
                    <input type="hidden" name="isFrozen" value="on" />
                  ) : null}
                </>
              ) : null}
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
                  {attributeRows.map((row, index) => (
                    <div
                      key={`attr-${index}`}
                      className={detailStyles.attributeRow}
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
                  ))}
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

              <SkuFormActions onCancel={closeModal} />
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
