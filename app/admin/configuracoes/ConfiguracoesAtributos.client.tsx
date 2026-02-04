"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import Select from "../_components/Select";
import Switch from "../_components/Switch";
import styles from "../_styles/adminPrimitives.module.css";
import modalStyles from "../categories/categories.module.css";
import layoutStyles from "./configuracoes.module.css";
import {
  createAtributoActionJson,
  updateAtributoActionJson,
  toggleAtributoAction,
  deleteAtributoAction,
} from "./actions";

type AttributeValue = {
  id: string;
  value: string;
};

type AttributeItem = {
  id: string;
  name: string;
  type: "TEXTO" | "NUMERO" | "LISTA";
  unit: string | null;
  isActive: boolean;
  values: AttributeValue[];
  skuUsageCount: number;
};

type AttributeModalProps = {
  isOpen: boolean;
  attribute: AttributeItem | null;
  onClose: () => void;
  onSaved: (attribute: AttributeItem) => void;
};

const TYPE_LABELS: Record<AttributeItem["type"], string> = {
  TEXTO: "Texto",
  NUMERO: "Numero",
  LISTA: "Lista",
};

function sortAttributes(list: AttributeItem[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

function AttributeModal({ isOpen, attribute, onClose, onSaved }: AttributeModalProps) {
  const isEditing = Boolean(attribute);
  const [name, setName] = useState(attribute?.name ?? "");
  const [type, setType] = useState<AttributeItem["type"]>(
    attribute?.type ?? "TEXTO"
  );
  const [unit, setUnit] = useState(attribute?.unit ?? "");
  const [values, setValues] = useState(
    attribute?.type === "LISTA"
      ? attribute.values.map((item) => item.value).join(", ")
      : ""
  );
  const [isActive, setIsActive] = useState(attribute?.isActive ?? true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const inUse = Boolean(attribute?.skuUsageCount);
  const lockType = isEditing && inUse;
  const lockValues = isEditing && inUse && attribute?.type === "LISTA";

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeOptions = [
    { value: "TEXTO", label: "Texto" },
    { value: "NUMERO", label: "Numero" },
    { value: "LISTA", label: "Lista" },
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const formData = new FormData();
      if (attribute?.id) {
        formData.append("id", attribute.id);
      }
      formData.append("name", name);
      formData.append("type", type);
      formData.append("unit", unit);
      formData.append("values", values);
      formData.append("isActive", isActive ? "on" : "off");

      const result = attribute
        ? await updateAtributoActionJson(formData)
        : await createAtributoActionJson(formData);

      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.attribute) {
        onSaved(result.attribute);
        onClose();
      }
    });
  };

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div
        className={modalStyles.modalCard}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={modalStyles.modalHeader}>
          <h2 className={modalStyles.modalTitle}>
            {isEditing ? "Editar atributo" : "Incluir atributo"}
          </h2>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
        <div className={modalStyles.modalBody}>
          {error ? <div className={styles.textError}>{error}</div> : null}
          <div className={styles.textMuted}>
            Atributos ajudam a padronizar dados dos SKUs.
          </div>
          {inUse ? (
            <div className={styles.textMuted}>
              Este atributo ja esta vinculado a SKUs. Tipo e lista de valores nao
              podem ser alterados.
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className={styles.formSection}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Nome do atributo</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Sabor"
                className={styles.control}
                required
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Tipo</span>
              <Select
                options={typeOptions}
                value={type}
                onChange={(value) => setType(value as AttributeItem["type"])}
                disabled={lockType}
                aria-label="Tipo"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Unidade (opcional)</span>
              <input
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
                placeholder="Ex.: g, ml, un"
                className={styles.control}
              />
            </label>
            {type === "LISTA" ? (
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Valores da lista</span>
                <textarea
                  value={values}
                  onChange={(event) => setValues(event.target.value)}
                  placeholder="Pequeno, Medio, Grande"
                  className={`${styles.control} ${styles.controlTextarea}`}
                  disabled={lockValues}
                />
                <span className={styles.fieldHelp}>
                  Separe por virgula ou por linha.
                </span>
              </label>
            ) : null}
            <div className={styles.switchRow}>
              <Switch
                checked={isActive}
                onChange={setIsActive}
                label="Ativo"
                aria-label="Ativo"
                id="attribute-active-switch"
              />
            </div>
            <div className={modalStyles.modalFooter}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonGhost}`}
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.buttonPrimary}`}
                disabled={isPending}
              >
                {isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ConfiguracoesAtributos({
  initialAttributes,
}: {
  initialAttributes: AttributeItem[];
}) {
  const [attributes, setAttributes] = useState<AttributeItem[]>(
    () => initialAttributes
  );
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AttributeItem | null>(null);
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return attributes;
    return attributes.filter((attr) => attr.name.toLowerCase().includes(query));
  }, [attributes, search]);

  const handleSaved = (attribute: AttributeItem) => {
    setAttributes((prev) => {
      const exists = prev.some((item) => item.id === attribute.id);
      const next = exists
        ? prev.map((item) => (item.id === attribute.id ? attribute : item))
        : [...prev, attribute];
      return sortAttributes(next);
    });
  };

  const handleToggle = (attribute: AttributeItem) => {
    setActionError("");
    startTransition(async () => {
      const result = await toggleAtributoAction(attribute.id, !attribute.isActive);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      if (result.attribute) {
        handleSaved(result.attribute);
      }
    });
  };

  const handleDelete = (attribute: AttributeItem) => {
    if (!confirm("Excluir este atributo?")) return;
    setActionError("");
    startTransition(async () => {
      const result = await deleteAtributoAction(attribute.id);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setAttributes((prev) => prev.filter((item) => item.id !== attribute.id));
    });
  };

  return (
    <section className={styles.panel}>
      <div className={layoutStyles.sectionHeader}>
        <div>
          <h2 className={layoutStyles.sectionTitle}>Atributos</h2>
          <p className={layoutStyles.sectionDescription}>
            Padronize os detalhes dos SKUs com listas e unidades controladas.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={18} aria-hidden />
          Incluir atributo
        </button>
      </div>

      <div className={layoutStyles.toolbar}>
        <input
          type="search"
          placeholder="Buscar atributo"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={`${styles.control} ${layoutStyles.searchInput}`}
        />
        {actionError ? (
          <span className={styles.textError}>{actionError}</span>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>Nenhum atributo encontrado.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Unidade</th>
                <th>Status</th>
                <th className={styles.tableActions}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((attribute) => (
                <tr key={attribute.id}>
                  <td>
                    <div className={layoutStyles.attributeName}>{attribute.name}</div>
                    {attribute.skuUsageCount > 0 ? (
                      <div className={layoutStyles.attributeMeta}>
                        Usado em {attribute.skuUsageCount} SKU(s)
                      </div>
                    ) : null}
                    {attribute.type === "LISTA" ? (
                      <div className={layoutStyles.attributeMeta}>
                        {attribute.values.length} valores cadastrados
                      </div>
                    ) : null}
                  </td>
                  <td>{TYPE_LABELS[attribute.type]}</td>
                  <td>{attribute.unit || "-"}</td>
                  <td>
                    <span
                      className={`${layoutStyles.statusBadge} ${
                        attribute.isActive
                          ? layoutStyles.statusActive
                          : layoutStyles.statusInactive
                      }`}
                    >
                      {attribute.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className={styles.tableActions}>
                    <div className={layoutStyles.actionGroup}>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                        onClick={() => {
                          setEditing(attribute);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil size={14} aria-hidden />
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                        onClick={() => handleToggle(attribute)}
                        disabled={isPending}
                      >
                        {attribute.isActive ? (
                          <ToggleLeft size={16} aria-hidden />
                        ) : (
                          <ToggleRight size={16} aria-hidden />
                        )}
                        {attribute.isActive ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className={`${styles.button} ${styles.buttonGhost} ${styles.buttonSm}`}
                        onClick={() => handleDelete(attribute)}
                        disabled={attribute.skuUsageCount > 0 || isPending}
                      >
                        <Trash2 size={14} aria-hidden />
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <AttributeModal
          key={editing?.id ?? "new"}
          isOpen={modalOpen}
          attribute={editing}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}
    </section>
  );
}
