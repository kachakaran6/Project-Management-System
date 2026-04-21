"use client";

import { useState } from "react";
import { Building2, Check, ChevronDown, User2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useSwitchOrganizationMutation } from "@/features/organization/hooks/use-org-query";
import { OrganizationMembership } from "@/types/organization.types";
import { CreateOrgModal } from "@/features/organization/components/create-org-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type SwitcherMode = "solo" | "single" | "multiple";

function resolveMode(
  organizations: OrganizationMembership[],
  userId?: string,
): SwitcherMode {
  if (!organizations || organizations.length === 0) return "solo";
  if (organizations.length === 1) return "single";
  return "multiple";
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RolePill({ role }: { role: string }) {
  const clean = role.replace(/_/g, " ");
  return (
    <span className="rounded-md bg-primary/10 px-1.5 py-px text-[9px] font-semibold uppercase tracking-widest text-primary">
      {clean}
    </span>
  );
}

// ─── Org Avatar ───────────────────────────────────────────────────────────────

function OrgAvatar({
  name,
  active = false,
  size = "sm",
}: {
  name: string;
  active?: boolean;
  size?: "sm" | "md";
}) {
  const letter = name?.[0]?.toUpperCase() ?? "?";
  return (
    <div
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-lg font-bold text-primary-foreground",
        active ? "bg-primary shadow-sm" : "bg-primary/20 text-primary",
        size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-sm",
      )}
    >
      {letter}
    </div>
  );
}

// ─── SOLO STATE: Personal Workspace pill ─────────────────────────────────────

function SoloChip({ onCreateOrg, isAdmin }: { onCreateOrg: () => void, isAdmin: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3",
                "text-sm text-muted-foreground backdrop-blur-sm",
              )}
            >
              <User2 className="size-4 flex-shrink-0 text-muted-foreground" />
              <span className="truncate font-medium text-foreground">Personal Workspace</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            You are not part of any organization
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isAdmin && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onCreateOrg}
          className="h-9 border-dashed"
        >
          <Building2 className="mr-2 h-4 w-4" />
          Create Org
        </Button>
      )}
    </div>
  );
}

// ─── SINGLE ORG: Static non-clickable label ───────────────────────────────────

function SingleOrgChip({ org, onCreateOrg, isAdmin }: { org: OrganizationMembership, onCreateOrg: () => void, isAdmin: boolean }) {
  if (!isAdmin) {
    return (
      <div
        className={cn(
          "flex h-9 max-w-[220px] items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3",
          "text-sm backdrop-blur-sm",
        )}
      >
        <OrgAvatar name={org.name} active size="sm" />
        <span className="min-w-0 truncate font-medium text-foreground">
          {org.name}
        </span>
        <RolePill role={org.role} />
      </div>
    );
  }

  return (
     <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex h-9 max-w-[220px] items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3",
              "text-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-primary/5",
            )}
          >
            <OrgAvatar name={org.name} active size="sm" />
            <span className="min-w-0 truncate font-medium text-foreground">
              {org.name}
            </span>
            <RolePill role={org.role} />
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-56 overflow-hidden rounded-xl border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-md">
          <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Options
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="mb-1" />
          <DropdownMenuItem
             onSelect={(e) => { e.preventDefault(); onCreateOrg(); }}
             className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2"
          >
             <Building2 className="mr-2 h-4 w-4 text-primary" />
             <span className="text-sm font-medium">Create New Organization</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── MULTI ORG: Full dropdown switcher ────────────────────────────────────────

function MultiOrgDropdown({
  organizations,
  activeOrgId,
  onCreateOrg,
  isAdmin,
}: {
  organizations: OrganizationMembership[];
  activeOrgId: string | null;
  onCreateOrg: () => void;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const switchOrg = useSwitchOrganizationMutation();

  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const displayName = activeOrg?.name ?? "Select organization";

  const handleSelect = async (orgId: string) => {
    if (orgId === activeOrgId) { setOpen(false); return; }
    try {
      await switchOrg.mutateAsync(orgId);
    } finally {
      setOpen(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-expanded={open}
          aria-label="Switch organization"
          className={cn(
            "flex h-9 max-w-[220px] items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-3",
            "text-sm font-medium backdrop-blur-sm transition-all duration-150",
            "hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            open && "border-primary/40 bg-primary/5 shadow-sm",
          )}
        >
          {/* Active org avatar */}
          {activeOrg ? (
            <OrgAvatar name={activeOrg.name} active size="sm" />
          ) : (
            <Building2 className="size-4 flex-shrink-0 text-primary" />
          )}

          {/* Name */}
          <span className="min-w-0 flex-1 truncate text-foreground">
            {displayName}
          </span>

          {/* Chevron or loading spinner */}
          {switchOrg.isPending ? (
            <Loader2 className="size-3.5 flex-shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDown
              className={cn(
                "size-3.5 flex-shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-64 overflow-hidden rounded-xl border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
      >
        {/* Header */}
        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Your Organizations
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mb-1" />

        {/* Org list */}
        <div className="space-y-0.5">
          {organizations.map((org) => {
            const isActive = org.id === activeOrgId;
            return (
              <DropdownMenuItem
                key={org.id}
                onSelect={(e) => { e.preventDefault(); handleSelect(org.id); }}
                className={cn(
                  "group flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-all",
                  "focus:bg-primary/8",
                  isActive && "bg-primary/8",
                )}
              >
                {/* Org avatar */}
                <OrgAvatar name={org.name} active={isActive} size="md" />

                {/* Name + role */}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm",
                      isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80",
                    )}
                  >
                    {org.name}
                  </p>
                  <p className="mt-0.5 text-[10px] capitalize text-muted-foreground">
                    {org.role.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>

                {/* Active check */}
                {isActive ? (
                  <Check className="size-4 flex-shrink-0 text-primary" />
                ) : switchOrg.isPending ? (
                  <Loader2 className="size-4 flex-shrink-0 animate-spin opacity-30" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </div>

        {isAdmin && (
          <>
            <DropdownMenuSeparator className="mt-1" />
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); onCreateOrg(); }}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-primary hover:bg-primary/5 focus:bg-primary/5"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </div>
              <span className="text-sm font-semibold">Create Organization</span>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="mt-1" />

        {/* Footer: count pill */}
        <div className="px-2.5 py-1.5 text-[10px] text-muted-foreground">
          {organizations.length} organization{organizations.length > 1 ? "s" : ""} available
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * SmartOrgSwitcher — adapts automatically to the user's org state:
 *
 * • solo     → "Personal Workspace" static chip (no dropdown)
 * • single   → Org name static chip with role pill (no dropdown)
 * • multiple → Full interactive dropdown to switch orgs
 */
export function SmartOrgSwitcher() {
  const { organizations, activeOrgId, isAdmin } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const mode = resolveMode(organizations, undefined);
  const activeOrg = organizations.find((o) => o.id === activeOrgId) ?? organizations[0];

  const renderContent = () => {
    switch (mode) {
      case "solo":
        return null; // Don't show anything if no orgs (shouldn't happen now)

      case "single":
        // For a single org, show nothing by default to keep it clean (Personal Workspace mode)
        // Unless specific org-related actions are needed
        return null;

      case "multiple":
        return (
          <MultiOrgDropdown
            organizations={organizations}
            activeOrgId={activeOrgId}
            onCreateOrg={() => setCreateModalOpen(true)}
            isAdmin={isAdmin}
          />
        );
    }
  };

  return (
    <>
      {renderContent()}
      <CreateOrgModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </>
  );
}

// ─── Legacy compat: Keep old name working ────────────────────────────────────
export { SmartOrgSwitcher as OrganizationSwitcher };
export { SmartOrgSwitcher as HeaderOrgSwitcher };
