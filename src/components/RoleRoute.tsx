import { Center, Spinner } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../services/api";

/** Protege uma rota exigindo autenticação e um papel específico. */
export function RoleRoute({
  requiredRole,
  children,
}: {
  requiredRole: Role;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center py={20}>
        <Spinner />
      </Center>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (user.role !== requiredRole) return <Navigate to="/" replace />;

  return <>{children}</>;
}
