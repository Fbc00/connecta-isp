import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Root } from "./pages/Root";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        index: true,
        // rota de tarefas exige sessão
        element: (
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        ),
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
]);

export function App() {
  return <RouterProvider router={router} />;
}
