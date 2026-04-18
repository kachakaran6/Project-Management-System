import type { ComponentType } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import DashboardGroupLayout from "@/app/(dashboard)/layout";

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

  if (modulePath.includes("/(dashboard)/")) {
    return <DashboardGroupLayout>{pageElement}</DashboardGroupLayout>;
  }

  return pageElement;
}

const routes = Object.entries(pageModules).map(([modulePath, module]) => ({
  path: toRoutePath(modulePath),
  element: wrapElement(modulePath, module.default),
}));

const router = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
