"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, Plus } from "lucide-react";
import styles from "../_styles/adminPrimitives.module.css";
import comboStyles from "./CategoryCombobox.module.css";

type CategoryOption = {
  id: string;
  label: string;
};

type Entry =
  | { type: "section"; label: string }
  | { type: "option"; option: CategoryOption }
  | { type: "create"; label: string };

type CategoryComboboxProps = {
  options: CategoryOption[];
  recentOptions?: CategoryOption[];
  value: string;
  onChange: (id: string) => void;
  onCreateCategory: () => void;
  name?: string;
  required?: boolean;
  "aria-label"?: string;
};

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export default function CategoryCombobox({
  options,
  recentOptions = [],
  value,
  onChange,
  onCreateCategory,
  name,
  required = false,
  "aria-label": ariaLabel,
}: CategoryComboboxProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value]
  );

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setInputValue(selectedOption?.label ?? "");
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, selectedOption?.label]);

  const entries = useMemo<Entry[]>(() => {
    if (!options.length && !recentOptions.length) {
      return [];
    }

    const items: Entry[] = [];
    const query = normalizeQuery(inputValue);

    if (!query) {
      const recentSet = new Set(recentOptions.map((opt) => opt.id));
      const recentList = recentOptions.filter((opt) => options.some((item) => item.id === opt.id));
      if (recentList.length) {
        items.push({ type: "section", label: "Ultimas categorias" });
        recentList.forEach((opt) => items.push({ type: "option", option: opt }));
      }

      const remaining = options.filter((opt) => !recentSet.has(opt.id));
      if (remaining.length) {
        if (recentList.length) {
          items.push({ type: "section", label: "Todas as categorias" });
        }
        remaining.forEach((opt) => items.push({ type: "option", option: opt }));
      }
      return items;
    }

    const filtered = options.filter((opt) =>
      normalizeQuery(opt.label).includes(query)
    );
    if (filtered.length) {
      filtered.forEach((opt) => items.push({ type: "option", option: opt }));
      return items;
    }

    items.push({ type: "create", label: "Criar nova categoria" });
    return items;
  }, [options, recentOptions, inputValue]);

  const selectableEntries = useMemo(
    () => entries.filter((entry) => entry.type !== "section"),
    [entries]
  );

  const activeEntry =
    activeIndex >= 0 ? selectableEntries[activeIndex] : null;
  const displayValue = open ? inputValue : selectedOption?.label ?? "";

  const handleSelect = (option: CategoryOption) => {
    onChange(option.id);
    setInputValue(option.label);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleCreate = () => {
    setOpen(false);
    setActiveIndex(-1);
    onCreateCategory();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      setInputValue(selectedOption?.label ?? "");
      setActiveIndex(selectableEntries.length > 0 ? 0 : -1);
      return;
    }
    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        Math.min(prev + 1, selectableEntries.length - 1)
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeEntry?.type === "option") {
        handleSelect(activeEntry.option);
      } else if (activeEntry?.type === "create") {
        handleCreate();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setInputValue(selectedOption?.label ?? "");
      setActiveIndex(-1);
    }
  };

  const activeDescendantId =
    activeEntry?.type === "option"
      ? `category-option-${activeEntry.option.id}`
      : activeEntry?.type === "create"
      ? "category-option-create"
      : undefined;

  return (
    <div className={comboStyles.combobox} ref={containerRef}>
      {name ? (
        <input type="hidden" name={name} value={value} required={required} />
      ) : null}
      <div className={comboStyles.inputWrap}>
        <input
          type="text"
          className={`${styles.control} ${comboStyles.input}`}
          placeholder="Selecione ou digite para buscar"
          value={displayValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => {
            setInputValue(selectedOption?.label ?? "");
            setOpen(true);
            setActiveIndex(selectableEntries.length > 0 ? 0 : -1);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
              setInputValue(selectedOption?.label ?? "");
              setActiveIndex(-1);
            }, 150);
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendantId}
          aria-label={ariaLabel}
        />
        <button
          type="button"
          className={comboStyles.toggleButton}
          aria-label="Mostrar categorias"
          onClick={() => {
            setOpen((prev) => {
              const next = !prev;
              if (next) {
                setInputValue(selectedOption?.label ?? "");
                setActiveIndex(selectableEntries.length > 0 ? 0 : -1);
              } else {
                setInputValue(selectedOption?.label ?? "");
                setActiveIndex(-1);
              }
              return next;
            });
          }}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      {open ? (
        <ul className={styles.autocompleteList} role="listbox" id={listId}>
          {entries.length === 0 ? (
            <li className={styles.autocompleteEmpty}>Nenhuma categoria encontrada.</li>
          ) : null}
          {entries.map((entry, index) => {
            if (entry.type === "section") {
              return (
                <li key={`section-${index}`} className={comboStyles.sectionLabel} role="presentation">
                  {entry.label}
                </li>
              );
            }

            if (entry.type === "create") {
              const isActive = activeEntry?.type === "create";
              return (
                <li
                  key="create-option"
                  id="category-option-create"
                  className={`${styles.autocompleteOption} ${comboStyles.createOption} ${
                    isActive ? styles.autocompleteOptionActive : ""
                  }`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    handleCreate();
                  }}
                >
                  <div className={styles.autocompleteMain}>
                    <Plus size={14} aria-hidden="true" />
                    <span>{entry.label}</span>
                  </div>
                  {inputValue.trim() ? (
                    <span className={styles.autocompleteMeta}>
                      &quot;{inputValue.trim()}&quot;
                    </span>
                  ) : null}
                </li>
              );
            }

            const isActive =
              activeEntry?.type === "option" &&
              activeEntry.option.id === entry.option.id;
            return (
              <li
                key={entry.option.id}
                id={`category-option-${entry.option.id}`}
                className={`${styles.autocompleteOption} ${
                  isActive ? styles.autocompleteOptionActive : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelect(entry.option);
                }}
              >
                <div className={styles.autocompleteMain}>
                  <span>{entry.option.label}</span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
