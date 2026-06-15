import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Root } from "./pages/Root";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      {
        index: true,
        lazy: () => import("./pages/Home").then((m) => ({ Component: m.Home })),
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
