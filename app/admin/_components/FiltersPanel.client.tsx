"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, ListFilter } from "lucide-react";
import Button from "./Button";
import styles from "./FiltersPanel.module.css";

export interface FiltersPanelProps {
  activeCount: number;
  onApply: () => void;
  onClear: () => void;
  variant?: "popover" | "drawer";
  density?: "comfortable" | "compact";
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
}

export default function FiltersPanel({
  activeCount,
  onApply,
  onClear,
  variant,
  density = "comfortable",
  children,
  isOpen,
  onClose,
  onToggle,
}: FiltersPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const effectiveVariant = variant || (isMobile ? "drawer" : "popover");

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    if (effectiveVariant === "popover") {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, effectiveVariant]);

  useEffect(() => {
    if (!isOpen || effectiveVariant !== "drawer") return;

    const focusableElements = panelRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      ) as HTMLElement[];

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [isOpen, effectiveVariant]);

  return (
    <>
      <Button
        variant="secondary"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={styles.triggerButton}
      >
        <ListFilter size={18} aria-hidden />
        Filtros
        {activeCount > 0 && (
          <span className={styles.badge} aria-label={`${activeCount} filtro${activeCount > 1 ? "s" : ""} ativo${activeCount > 1 ? "s" : ""}`}>
            {activeCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {effectiveVariant === "drawer" && (
            <div className={styles.overlay} onClick={onClose} aria-hidden />
          )}
          <div
            ref={panelRef}
            className={`${styles.panel} ${styles[`panel${effectiveVariant.charAt(0).toUpperCase() + effectiveVariant.slice(1)}`]} ${
              density === "compact" ? styles.panelCompact : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="filters-panel-title"
          >
            <div className={styles.panelHeader}>
              <div className={styles.panelHeaderContent}>
                <ListFilter size={18} aria-hidden />
                <h3 id="filters-panel-title" className={styles.panelTitle}>
                  Filtros
                </h3>
              </div>
              <button
                type="button"
                className={styles.panelClose}
                onClick={onClose}
                aria-label="Fechar filtros"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className={styles.panelBody}>{children}</div>

            <div className={styles.panelFooter}>
              <Button variant="ghost" onClick={onClear}>
                Limpar
              </Button>
              <Button variant="primary" onClick={onApply}>
                Aplicar filtros
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
