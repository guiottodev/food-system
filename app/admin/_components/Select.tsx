"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import styles from "./Select.module.css";

export type SelectOption = {
  value: string;
  label: string;
};

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  id?: string;
  className?: string;
  variant?: "default" | "error";
  density?: "comfortable" | "compact";
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function Select({
  options,
  value,
  onChange,
  name,
  disabled = false,
  required = false,
  placeholder = "Selecione...",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  id,
  className = "",
  variant = "default",
  density = "comfortable",
  containerRef: externalContainerRef,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Fechar com Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Navegação por teclado nas opções
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(!isOpen);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        onChange(options[nextIndex].value);
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (isOpen) {
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        onChange(options[prevIndex].value);
      }
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const variantClass = variant !== "default" ? styles[`select${variant.charAt(0).toUpperCase() + variant.slice(1)}`] : "";
  const densityClass = density === "compact" ? styles.selectCompact : "";

  return (
    <div className={`${styles.select} ${className}`} ref={containerRef}>
      {/* Hidden input para formulários */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
          aria-invalid={ariaInvalid}
        />
      )}
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.selectTrigger} ${isOpen ? styles.selectTriggerOpen : ""} ${disabled ? styles.selectTriggerDisabled : ""} ${variantClass} ${densityClass}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        disabled={disabled}
        id={id}
      >
        <span className={styles.selectValue}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`${styles.selectIcon} ${isOpen ? styles.selectIconOpen : ""}`} 
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className={styles.selectDropdown} role="listbox">
          <ul className={styles.selectList}>
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`${styles.selectOption} ${option.value === value ? styles.selectOptionSelected : ""}`}
                onClick={() => handleOptionClick(option.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOptionClick(option.value);
                  }
                }}
                tabIndex={0}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check size={14} className={styles.selectCheck} aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
