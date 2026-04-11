import {
  SidebarItem,
  SidebarNavItem,
} from "@/components/layout/sidebar/sidebar-item";

interface SidebarGroupProps {
  label: string;
  items: SidebarNavItem[];
  currentPath: string;
  collapsed: boolean;
}

export function SidebarGroup({
  label,
  items,
  currentPath,
  collapsed,
}: SidebarGroupProps) {
  if (!items.length) return null;

  return (
    <div className="space-y-1">
      {!collapsed ? (
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/55">
          {label}
        </p>
      ) : null}
      {items.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          isActive={currentPath === item.href}
          collapsed={collapsed}
        />
      ))}
    </div>
  );
}
