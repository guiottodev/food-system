"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { Clock, ChevronDown } from "lucide-react";
import styles from "./TimePicker.module.css";

export interface TimePickerProps {
  value: string; // formato HH:MM
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
  interval?: 30 | 60; // intervalo em minutos (30 ou 60)
}

export interface TimePickerHandle {
  focus: () => void;
}

// Gerar opções de hora
const generateTimeOptions = (interval: 30 | 60 = 30): string[] => {
  const options: string[] = [];
  const totalMinutes = 24 * 60;
  
  for (let minutes = 0; minutes < totalMinutes; minutes += interval) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    options.push(timeStr);
  }
  
  return options;
};

// Validar formato de hora HH:MM
const isValidTimeFormat = (time: string): boolean => {
  if (!time || !time.trim()) return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time.trim());
};

// Normalizar entrada de hora (ex: "1230" -> "12:30", "9" -> "09:00")
const normalizeTimeInput = (input: string, interval: 30 | 60): string | null => {
  if (!input || !input.trim()) return null;
  
  // Remove tudo exceto números
  const numbers = input.replace(/\D/g, "");
  
  if (numbers.length === 0) return null;
  
  // Se tem 4 dígitos, assume HHMM
  if (numbers.length >= 4) {
    const hours = parseInt(numbers.slice(0, 2), 10);
    const minutes = parseInt(numbers.slice(2, 4), 10);
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      // Arredondar minutos para o intervalo mais próximo
      const roundedMinutes = Math.round(minutes / interval) * interval;
      const finalHours = roundedMinutes >= 60 ? hours + 1 : hours;
      const finalMins = roundedMinutes >= 60 ? 0 : roundedMinutes;
      
      if (finalHours <= 23) {
        return `${String(finalHours).padStart(2, "0")}:${String(finalMins).padStart(2, "0")}`;
      }
    }
  }
  
  // Se tem 1-2 dígitos, assume horas
  if (numbers.length <= 2) {
    const hours = parseInt(numbers, 10);
    if (hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, "0")}:00`;
    }
  }
  
  return null;
};

const TimePicker = forwardRef<TimePickerHandle, TimePickerProps>(({
  value,
  onChange,
  onBlur,
  name,
  disabled = false,
  required = false,
  placeholder = "Selecione o horário",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  id,
  className = "",
  variant = "default",
  interval = 30,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [isEditing, setIsEditing] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const timeOptions = generateTimeOptions(interval);

  // Sincronizar inputValue com value prop (apenas quando não está editando)
  useEffect(() => {
    if (!isEditing && !isOpen) {
      setInputValue(value || "");
    }
  }, [value, isEditing, isOpen]);

  // Função para calcular e atualizar posição do dropdown
  const updateDropdownPosition = useCallback(() => {
    if (!isOpen || !inputRef.current || isScrollingRef.current) {
      return;
    }

    const rect = inputRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const dropdownWidth = rect.width;
    
    // Ajustar posição horizontal se necessário
    let left = rect.left;
    if (left + dropdownWidth > viewportWidth) {
      left = viewportWidth - dropdownWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }
    
    // Calcular altura aproximada do dropdown
    const estimatedHeight = 280;
    let top = rect.bottom + 4;
    
    // Se não couber abaixo, mostrar acima
    if (top + estimatedHeight > viewportHeight && rect.top > estimatedHeight) {
      top = rect.top - estimatedHeight - 4;
    }
    
    setDropdownPosition({
      top,
      left,
      width: dropdownWidth,
    });
  }, [isOpen]);

  // Calcular posição inicial quando abrir
  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para garantir que o DOM está atualizado
      setTimeout(() => {
        updateDropdownPosition();
      }, 0);
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen, updateDropdownPosition]);

  // Atualizar posição ao redimensionar (mas não ao scrollar dentro do dropdown)
  useEffect(() => {
    if (!isOpen) return;

    let rafId: number | null = null;
    
    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!isScrollingRef.current) {
          updateDropdownPosition();
        }
      });
    };

    // Escutar scroll apenas na window (não em containers internos)
    const handleWindowScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // Só atualizar se não estiver rolando dentro do dropdown
        if (!isScrollingRef.current) {
          updateDropdownPosition();
        }
      });
    };

    window.addEventListener("scroll", handleWindowScroll, true);
    window.addEventListener("resize", handleResize);
    
    // Detectar scroll dentro do dropdown
    const handleDropdownScroll = () => {
      isScrollingRef.current = true;
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };

    if (scrollContainerRef.current) {
      scrollContainerRef.current.addEventListener("scroll", handleDropdownScroll);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleWindowScroll, true);
      window.removeEventListener("resize", handleResize);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.removeEventListener("scroll", handleDropdownScroll);
      }
    };
  }, [isOpen, updateDropdownPosition]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Não fechar se o clique foi em um botão de opção ou no input
      const clickedElement = target as Element;
      if (clickedElement.closest && (
        clickedElement.closest(`[role="option"]`) ||
        clickedElement === inputRef.current ||
        containerRef.current?.contains(clickedElement)
      )) {
        return;
      }
      
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
        // Só setar isEditing como false se realmente saiu do componente
        setTimeout(() => {
          if (!containerRef.current?.contains(document.activeElement)) {
            setIsEditing(false);
          }
        }, 100);
      }
    }

    if (isOpen) {
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Fechar com Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsEditing(false);
        setInputValue(value || "");
        inputRef.current?.focus();
      }
    }

    if (isOpen || isEditing) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isEditing, value]);

  // Scroll para o item selecionado quando abrir
  useEffect(() => {
    if (isOpen && value && scrollContainerRef.current) {
      const selectedIndex = timeOptions.indexOf(value);
      if (selectedIndex >= 0) {
        const selectedElement = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
        if (selectedElement) {
          setTimeout(() => {
            selectedElement.scrollIntoView({ block: "center", behavior: "smooth" });
          }, 150);
        }
      }
    }
  }, [isOpen, value, timeOptions]);

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsEditing(true);
    
    // Se o formato é válido, atualizar imediatamente
    if (isValidTimeFormat(newValue)) {
      onChange(newValue);
    }
    
    // Abrir dropdown se houver texto
    if (newValue && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(true);
    // Selecionar todo o texto ao focar para facilitar edição
    setTimeout(() => {
      e.target.select();
    }, 0);
    // Não abrir dropdown automaticamente ao focar (só se clicar no botão)
  };

  const handleInputBlur = () => {
    // Delay para permitir clique no dropdown
    setTimeout(() => {
      // Verificar se o foco voltou para o input ou dropdown
      const activeElement = document.activeElement;
      const isFocusInComponent = 
        containerRef.current?.contains(activeElement) ||
        dropdownRef.current?.contains(activeElement);
      
      if (isFocusInComponent) {
        // Foco ainda está no componente, não fazer blur
        return;
      }
      
      // Foco saiu do componente, processar blur
      setIsOpen(false);
      setIsEditing(false);
      
      // Se o valor não é válido, tentar normalizar ou reverter
      if (inputValue && !isValidTimeFormat(inputValue)) {
        const normalized = normalizeTimeInput(inputValue, interval);
        if (normalized && isValidTimeFormat(normalized)) {
          onChange(normalized);
          setInputValue(normalized);
        } else {
          // Reverter para o valor anterior
          setInputValue(value || "");
        }
      } else if (isValidTimeFormat(inputValue)) {
        // Se é válido, garantir que está sincronizado
        onChange(inputValue);
      }
      
      onBlur?.();
    }, 200);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Tentar normalizar e aplicar
      const normalized = normalizeTimeInput(inputValue, interval);
      if (normalized && isValidTimeFormat(normalized)) {
        onChange(normalized);
        setInputValue(normalized);
        setIsOpen(false);
        setIsEditing(false);
      } else if (isValidTimeFormat(inputValue)) {
        onChange(inputValue);
        setIsOpen(false);
        setIsEditing(false);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      }
      // Focar primeira opção do dropdown
      setTimeout(() => {
        const firstOption = scrollContainerRef.current?.querySelector('[role="option"]') as HTMLElement;
        firstOption?.focus();
      }, 100);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setIsEditing(false);
      setInputValue(value || "");
    }
  };

  const handleTimeSelect = (time: string) => {
    onChange(time);
    setInputValue(time);
    setIsOpen(false);
    // Não setar isEditing como false imediatamente para permitir edição contínua
    setTimeout(() => {
      setIsEditing(false);
      inputRef.current?.focus();
      inputRef.current?.select(); // Selecionar texto para facilitar edição
      onBlur?.();
    }, 100);
  };

  const handleDropdownClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
      setIsEditing(true);
      inputRef.current?.focus();
    }
  };

  const variantClass = variant !== "default" ? styles[`timePicker${variant.charAt(0).toUpperCase() + variant.slice(1)}`] : "";
  const hasValidValue = isValidTimeFormat(inputValue) || isValidTimeFormat(value);

  return (
    <div className={`${styles.timePicker} ${className}`} ref={containerRef} style={{ position: "relative", zIndex: isOpen ? 1000 : "auto" }}>
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
      <div className={`${styles.timePickerInputWrapper} ${isOpen ? styles.timePickerInputWrapperOpen : ""} ${disabled ? styles.timePickerInputWrapperDisabled : ""} ${variantClass}`}>
        <Clock size={16} className={styles.timePickerIcon} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid || (!hasValidValue && inputValue.length > 0)}
          aria-describedby={ariaDescribedBy}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          id={id}
          className={styles.timePickerInput}
        />
        <button
          type="button"
          onClick={handleDropdownClick}
          disabled={disabled}
          className={styles.timePickerDropdownButton}
          aria-label="Abrir lista de horários"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <ChevronDown 
            size={16} 
            className={`${styles.timePickerChevron} ${isOpen ? styles.timePickerChevronOpen : ""}`} 
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen && dropdownPosition && typeof window !== "undefined" && createPortal(
        <div 
          ref={dropdownRef}
          className={styles.timePickerDropdown} 
          role="listbox"
          style={{
            position: "fixed",
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          <div className={styles.timePickerScrollContainer} ref={scrollContainerRef}>
            {timeOptions.map((time) => {
              const isSelected = time === value;
              return (
                <button
                  key={time}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`${styles.timePickerOption} ${isSelected ? styles.timePickerOptionSelected : ""}`}
                  onClick={() => handleTimeSelect(time)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleTimeSelect(time);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const next = e.currentTarget.nextElementSibling as HTMLElement;
                      next?.focus();
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const prev = e.currentTarget.previousElementSibling as HTMLElement;
                      prev?.focus();
                    }
                  }}
                  tabIndex={0}
                >
                  {time}
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

TimePicker.displayName = "TimePicker";

export default TimePicker;
