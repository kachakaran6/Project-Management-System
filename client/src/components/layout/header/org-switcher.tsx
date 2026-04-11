"use client";

import { Building2, Check, ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useSwitchOrganizationMutation } from "@/features/organization/hooks/use-org-query";

export function HeaderOrgSwitcher() {
  const { organizations, activeOrgId } = useAuth();
  const switchOrganization = useSwitchOrganizationMutation();

  const activeOrg = organizations.find((org) => org.id === activeOrgId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="max-w-[220px] justify-between gap-2"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Building2 className="size-4" />
            <span className="truncate">
              {activeOrg?.name ?? "Select organization"}
            </span>
          </span>
          <ChevronsUpDown className="size-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={async (event) => {
              event.preventDefault();
              await switchOrganization.mutateAsync(org.id);
            }}
            className="flex items-center justify-between"
          >
            <span>{org.name}</span>
            {org.id === activeOrgId ? (
              <Check className="size-4 text-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
