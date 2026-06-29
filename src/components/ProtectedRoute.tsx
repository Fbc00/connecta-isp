import { Center, Spinner } from "@chakra-ui/react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Center py={20}>
        <Spinner />
      </Center>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  return <>{children}</>;
}
