import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRoute } from "./components/RoleRoute";
import { Home } from "./pages/Home";
import { Root } from "./pages/Root";

const lazy =
  (loader: () => Promise<Record<string, React.ComponentType>>, name: string) => () =>
    loader().then((m) => ({ Component: m[name] }));

const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        element: (
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        ),
        children: [
          { index: true, Component: Home },
          {
            path: "contatos",
            lazy: lazy(() => import("./pages/Contacts"), "Contacts"),
          },
          {
            path: "campanhas",
            lazy: lazy(() => import("./pages/Campaigns"), "Campaigns"),
          },
          {
            path: "templates",
            lazy: lazy(() => import("./pages/Templates"), "Templates"),
          },
          {
            path: "mensagens",
            lazy: lazy(() => import("./pages/Messages"), "Messages"),
          },
          {
            path: "nps",
            lazy: lazy(() => import("./pages/Surveys"), "Surveys"),
          },
        ],
      },
      {
        element: (
          <RoleRoute requiredRole="super_admin">
            <AppShell />
          </RoleRoute>
        ),
        children: [
          {
            path: "admin/empresas",
            lazy: lazy(() => import("./pages/admin/Companies"), "Companies"),
          },
          {
            path: "admin/analytics",
            lazy: lazy(() => import("./pages/admin/Analytics"), "Analytics"),
          },
        ],
      },
      {
        path: "auth",
        lazy: () =>
          import("./pages/AuthLayout").then((m) => ({ Component: m.AuthLayout })),
        children: [
          {
            path: "login",
            lazy: () => import("./pages/Login").then((m) => ({ Component: m.Login })),
          },
          {
            path: "register",
            lazy: () =>
              import("./pages/Register").then((m) => ({ Component: m.Register })),
          },
        ],
      },
    ],
  },
  {
    path: "/nps/:token",
    lazy: () => import("./pages/PublicNps").then((m) => ({ Component: m.PublicNps })),
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
