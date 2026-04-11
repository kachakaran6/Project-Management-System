"use client";

import { useAuth } from "../hooks/use-auth";
import { Building2, Check, ChevronsUpDown, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useSwitchOrganizationMutation } from "@/features/organization/hooks/use-org-query";

export function OrganizationSwitcher() {
  const { organizations, activeOrgId } = useAuth();
  const [open, setOpen] = useState(false);
  const switchOrganization = useSwitchOrganizationMutation();

  const activeOrg = organizations.find((org) => org.id === activeOrgId);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select an organization"
          className={cn(
            "w-[240px] justify-between",
            "bg-card/50 backdrop-blur-sm border-white/10 hover:bg-white/10",
          )}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="truncate">
              {activeOrg ? activeOrg.name : "Select Organization"}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px] p-2" align="start">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        <div className="space-y-1 mt-1">
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={async () => {
                await switchOrganization.mutateAsync(org.id);
                setOpen(false);
              }}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    org.id === activeOrgId ? "bg-primary" : "bg-muted",
                  )}
                />
                <span className={org.id === activeOrgId ? "font-medium" : ""}>
                  {org.name}
                </span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {org.role.replace("_", " ")}
                </span>
              </div>
              {org.id === activeOrgId && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem className="cursor-pointer text-primary focus:text-primary">
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
