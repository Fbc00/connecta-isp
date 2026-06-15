import { Container, Flex, Heading, Link } from "@chakra-ui/react";
import { Outlet, Link as RouterLink } from "react-router-dom";

export function AuthLayout() {
  return (
    <Container maxW="sm" py={10}>
      <Heading size="md" mb={6} textAlign="center">
        Connecta ISP
      </Heading>

      <Flex gap={4} justify="center" mb={6}>
        <Link asChild>
          <RouterLink to="/auth/login">Login</RouterLink>
        </Link>
        <Link asChild>
          <RouterLink to="/auth/register">Registrar</RouterLink>
        </Link>
      </Flex>

      <Outlet />
    </Container>
  );
}
