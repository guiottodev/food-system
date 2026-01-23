"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import styles from "./orders.module.css";

type Option = {
  value: string;
  label: string;
};

type FilterSelectProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

export default function FilterSelect({
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Selecione...",
  "aria-label": ariaLabel,
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

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

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={styles.customSelect} ref={containerRef}>
      <button
        type="button"
        className={`${styles.customSelectTrigger} ${isOpen ? styles.customSelectTriggerOpen : ""} ${disabled ? styles.customSelectTriggerDisabled : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span className={styles.customSelectValue}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`${styles.customSelectIcon} ${isOpen ? styles.customSelectIconOpen : ""}`} 
        />
      </button>

      {isOpen && (
        <div className={styles.customSelectDropdown}>
          <ul className={styles.customSelectList} role="listbox">
            {options.map((option) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`${styles.customSelectOption} ${option.value === value ? styles.customSelectOptionSelected : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check size={14} className={styles.customSelectCheck} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
