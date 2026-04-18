"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/next-navigation";

/**
 * Redirect to tasks page - create modal is handled there
 * This page exists for backward compatibility with links
 */
export default function CreateTaskPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/tasks");
  }, [router]);

  return null;
}

