import type { ComponentType } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import AdminLayout from "@/app/(admin)/admin/layout";
import DashboardGroupLayout from "@/app/(dashboard)/layout";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";

type PageModule = {
  default: ComponentType;
};

const pageModules = import.meta.glob<PageModule>("./app/**/page.tsx", {
  eager: true,
});

function toRoutePath(modulePath: string) {
  const withoutPrefix = modulePath.replace(/^\.\/app/, "");
  const withoutPageSuffix = withoutPrefix.replace(/\/page\.tsx$/, "");
  const withoutRouteGroups = withoutPageSuffix.replace(/\/\([^/]+\)/g, "");
  const withDynamicSegments = withoutRouteGroups.replace(/\[([^\]]+)\]/g, ":$1");

  return withDynamicSegments === "" ? "/" : withDynamicSegments;
}

function wrapElement(modulePath: string, PageComponent: ComponentType) {
  const pageElement = <PageComponent />;

  if (modulePath.includes("/(admin)/")) {
    return <AdminLayout>{pageElement}</AdminLayout>;
  }

  if (modulePath.includes("/(dashboard)/")) {
    return <DashboardGroupLayout>{pageElement}</DashboardGroupLayout>;
  }

  return pageElement;
}

// 1. Generate dynamic routes from file system
const dynamicRoutes = Object.entries(pageModules).map(([modulePath, module]) => ({
  path: toRoutePath(modulePath),
  element: wrapElement(modulePath, module.default),
}));

// 2. Combine with manual routes and Error Boundary
const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <ErrorBoundary />,
    children: [
      ...dynamicRoutes,
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "reset-password",
        element: <ResetPassword />,
      },
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
