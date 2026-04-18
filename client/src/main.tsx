import { createRoot } from "react-dom/client";

import RootLayout from "@/app/layout";
import { AppRouter } from "@/router";

createRoot(document.getElementById("root")!).render(
  <RootLayout>
    <AppRouter />
  </RootLayout>,
);
