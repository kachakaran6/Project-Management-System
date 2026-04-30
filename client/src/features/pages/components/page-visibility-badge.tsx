import { Globe, Lock, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PageVisibility } from "@/types/page.types";

export function PageVisibilityBadge({ visibility }: { visibility: PageVisibility }) {
  if (visibility === "PUBLIC") {
    return (
      <Badge variant="default" className="gap-1">
        <Globe className="size-3" />
        Public
      </Badge>
    );
  }

  if (visibility === "WORKSPACE") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Users className="size-3" />
        Workspace
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <Lock className="size-3" />
      Private
    </Badge>
  );
}
