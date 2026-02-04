"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./DatePicker.module.css";

export interface DatePickerProps {
  value: string; // formato YYYY-MM-DD
  onChange: (value: string) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  id?: string;
  className?: string;
  variant?: "default" | "error";
  min?: string; // formato YYYY-MM-DD
  max?: string; // formato YYYY-MM-DD
}

export interface DatePickerHandle {
  focus: () => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const DatePicker = forwardRef<DatePickerHandle, DatePickerProps>(({
  value,
  onChange,
  onBlur,
  name,
  disabled = false,
  required = false,
  placeholder = "Selecione a data",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  id,
  className = "",
  variant = "default",
  min,
  max,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Função para calcular e atualizar posição do dropdown
  const updateDropdownPosition = useCallback((force = false) => {
    if ((!isOpen && !force) || !triggerRef.current) {
      if (isOpen) setDropdownPosition(null);
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 320;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Ajustar posição horizontal se necessário
    let left = rect.left;
    if (left + dropdownWidth > viewportWidth) {
      left = viewportWidth - dropdownWidth - 16; // 16px de margem
    }
    if (left < 16) {
      left = 16; // 16px de margem
    }
    
    // Calcular altura aproximada do dropdown (cabeçalho + semana + 6 semanas de dias)
    const estimatedHeight = 280;
    let top = rect.bottom + 4;
    
    // Se não couber abaixo, mostrar acima
    if (top + estimatedHeight > viewportHeight && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - 4;
    }
    
    setDropdownPosition({
      top,
      left,
      width: rect.width,
    });
  }, [isOpen]);

  // Atualizar posição ao rolar ou redimensionar
  useEffect(() => {
    if (!isOpen) return;

    let rafId: number | null = null;
    let scrollContainers: NodeListOf<Element> | null = null;
    
    const handleUpdate = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        updateDropdownPosition();
      });
    };

    // Escutar scroll na window (capture phase para pegar todos os scrolls)
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    
    // Encontrar containers de scroll próximos ao trigger (mais eficiente)
    const findScrollContainers = () => {
      if (!triggerRef.current) return [];
      
      const containers: Element[] = [];
      let parent: Element | null = triggerRef.current.parentElement;
      
      // Subir na árvore DOM até encontrar containers com scroll
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        if (style.overflow === 'auto' || style.overflow === 'scroll' || 
            style.overflowY === 'auto' || style.overflowY === 'scroll' ||
            style.overflowX === 'auto' || style.overflowX === 'scroll') {
          containers.push(parent);
        }
        parent = parent.parentElement;
      }
      
      // Também verificar window/document
      return containers;
    };

    // Encontrar containers uma vez e adicionar listeners
    const foundContainers = findScrollContainers();
    foundContainers.forEach(container => {
      container.addEventListener("scroll", handleUpdate, true);
    });
    scrollContainers = foundContainers as unknown as NodeListOf<Element>;

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
      if (scrollContainers) {
        Array.from(scrollContainers).forEach(container => {
          container.removeEventListener("scroll", handleUpdate, true);
        });
      }
    };
  }, [isOpen, updateDropdownPosition]);

  // Parse da data atual ou usar hoje
  const currentDate = value ? new Date(value + "T00:00:00") : new Date();
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());
  const syncViewToValue = () => {
    if (!value) return;
    const date = new Date(value + "T00:00:00");
    if (!isNaN(date.getTime())) {
      setViewMonth(date.getMonth());
      setViewYear(date.getFullYear());
    }
  };

  // Formatar data para exibição
  const formatDisplayDate = (dateStr: string | null): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
        setDropdownPosition(null);
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
        setDropdownPosition(null);
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

  // Gerar dias do mês
  const getDaysInMonth = (month: number, year: number): Date[] => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Adicionar dias do mês anterior para completar a semana
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Adicionar dias do mês atual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Adicionar dias do próximo mês para completar a semana
    const remaining = 42 - days.length; // 6 semanas * 7 dias
    for (let day = 1; day <= remaining; day++) {
      days.push(new Date(year, month + 1, day));
    }

    return days;
  };

  const days = getDaysInMonth(viewMonth, viewYear);
  const currentMonth = new Date(viewYear, viewMonth, 1);
  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateDisabled = (date: Date): boolean => {
    const dateStr = formatDateValue(date);
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };

  const formatDateValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      triggerRef.current?.focus();
    },
  }));

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;
    const dateStr = formatDateValue(date);
    onChange(dateStr);
    setIsOpen(false);
    setDropdownPosition(null);
    triggerRef.current?.focus();
    onBlur?.();
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === viewMonth && date.getFullYear() === viewYear;
  };

  const isToday = (date: Date): boolean => {
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const variantClass = variant !== "default" ? styles[`datePicker${variant.charAt(0).toUpperCase() + variant.slice(1)}`] : "";
  const handleToggleOpen = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
      setDropdownPosition(null);
      return;
    }
    syncViewToValue();
    setIsOpen(true);
    updateDropdownPosition(true);
  };

  return (
    <div className={`${styles.datePicker} ${className}`} ref={containerRef} style={{ position: "relative", zIndex: isOpen ? 1000 : "auto" }}>
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
        className={`${styles.datePickerTrigger} ${isOpen ? styles.datePickerTriggerOpen : ""} ${disabled ? styles.datePickerTriggerDisabled : ""} ${variantClass}`}
        onClick={handleToggleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        id={id}
      >
        <Calendar size={16} className={styles.datePickerIcon} aria-hidden="true" />
        <span className={styles.datePickerValue}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
      </button>

      {isOpen && dropdownPosition && typeof window !== "undefined" && createPortal(
        <div 
          ref={dropdownRef}
          className={styles.datePickerDropdown} 
          role="dialog" 
          aria-modal="true"
          style={{
            position: "fixed",
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: "320px",
            maxWidth: "calc(100vw - 32px)", // Garantir margem nas bordas
          }}
        >
          <div className={styles.datePickerHeader}>
            <button
              type="button"
              className={styles.datePickerNavButton}
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <div className={styles.datePickerMonthYear}>
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              className={styles.datePickerNavButton}
              onClick={handleNextMonth}
              aria-label="Próximo mês"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.datePickerWeekdays}>
            {WEEKDAYS.map((day) => (
              <div key={day} className={styles.datePickerWeekday}>
                {day}
              </div>
            ))}
          </div>

          <div className={styles.datePickerDays}>
            {days.map((date, index) => {
              const isDisabled = isDateDisabled(date);
              const isCurrent = isCurrentMonth(date);
              const isTodayDate = isToday(date);
              const isSelectedDate = isSelected(date);

              return (
                <button
                  key={index}
                  type="button"
                  className={`${styles.datePickerDay} ${
                    !isCurrent ? styles.datePickerDayOtherMonth : ""
                  } ${isTodayDate ? styles.datePickerDayToday : ""} ${
                    isSelectedDate ? styles.datePickerDaySelected : ""
                  } ${isDisabled ? styles.datePickerDayDisabled : ""}`}
                  onClick={() => handleDateSelect(date)}
                  disabled={isDisabled}
                  aria-label={`${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`}
                  aria-selected={isSelectedDate}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

DatePicker.displayName = "DatePicker";

export default DatePicker;
