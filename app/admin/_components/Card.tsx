import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";
import styles from "../_styles/adminPrimitives.module.css";

type CardProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export default function Card<T extends ElementType = "div">({
  as,
  children,
  className,
  ...props
}: CardProps<T>) {
  const Component = as ?? "div";
  const classes = `${styles.panel} ${className || ""}`.trim();
  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
}
