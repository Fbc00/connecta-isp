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
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
