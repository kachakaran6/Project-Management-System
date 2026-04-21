"use client";

import { useMemo } from "react";
import { usePathname } from "@/lib/next-navigation";
import Link from "@/lib/next-link";

function formatSegment(segment: string) {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname();
  
  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    
    // Base Dashboard entry
    const isAtDashboard = segments.length === 0 || (segments.length === 1 && segments[0].toLowerCase() === "dashboard");
    
    const parts = [
      { 
        name: "Dashboard", 
        href: "/dashboard", 
        current: isAtDashboard 
      }
    ];
    
    let currentPath = "";
    
    segments.forEach((segment, index) => {
      // Skip redundant "Dashboard" segment if it's the first segment
      if (index === 0 && segment.toLowerCase() === "dashboard") return;
      
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      parts.push({
        name: formatSegment(segment),
        href: currentPath,
        current: isLast,
      });
    });

    return parts;
  }, [pathname]);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] font-medium">
      {breadcrumbs.map((crumb, index) => (
        <div key={`${crumb.href}-${index}`} className="flex items-center gap-1.5">
          {index > 0 && (
            <span className="text-[10px] text-muted-foreground/30 font-normal select-none" aria-hidden="true">
              /
            </span>
          )}
          
          {crumb.current ? (
            <span 
              className="text-foreground font-semibold truncate max-w-[150px] sm:max-w-[250px]"
              aria-current="page"
            >
              {crumb.name}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground/60 transition-all hover:text-foreground/90 hover:underline hover:decoration-muted-foreground/20 underline-offset-4 decoration-1"
              aria-label={`Go to ${crumb.name}`}
            >
              {crumb.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
