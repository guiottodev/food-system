import {
  AlertCircle,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Package,
  Tags,
  Users,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  match: "exact" | "startsWith";
  icon: typeof LayoutDashboard;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Operacao",
    items: [
      {
        label: "Visao geral",
        href: "/admin",
        match: "exact",
        icon: LayoutDashboard,
      },
      {
        label: "Pedidos",
        href: "/admin/orders",
        match: "startsWith",
        icon: ClipboardList,
      },
      {
        label: "Pendencias",
        href: "/admin/pendencias",
        match: "startsWith",
        icon: AlertCircle,
      },
      {
        label: "Capacidade",
        href: "/admin/capacidade",
        match: "startsWith",
        icon: Gauge,
      },
      {
        label: "Clientes",
        href: "/admin/clientes",
        match: "startsWith",
        icon: Users,
      },
    ],
  },
  {
    title: "Cadastros",
    items: [
      {
        label: "Produtos",
        href: "/admin/products",
        match: "startsWith",
        icon: Package,
      },
      {
        label: "Categorias",
        href: "/admin/categories",
        match: "startsWith",
        icon: Tags,
      },
    ],
  },
];

export const primaryAction = {
  label: "+ Novo pedido",
  href: "/admin/orders/new",
};

export function isNavItemActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href || pathname === `${item.href}/`;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
