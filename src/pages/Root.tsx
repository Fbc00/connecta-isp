import { Box, Button, Container, Flex, Link, Spacer, Text } from "@chakra-ui/react";
import { Outlet, Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Root() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/auth/login");
  }

  return (
    <Box>
      <Box as="nav" borderBottomWidth="1px" bg="bg.subtle">
        <Container maxW="lg" py={3}>
          <Flex gap={4} align="center">
            <Link asChild fontWeight="medium">
              <RouterLink to="/">Home</RouterLink>
            </Link>
            {!user && (
              <Link asChild fontWeight="medium">
                <RouterLink to="/auth/login">Login</RouterLink>
              </Link>
            )}
            <Spacer />
            {user && (
              <>
                <Text color="fg.muted" fontSize="sm">
                  {user.name} · {user.role}
                </Text>
                <Button size="xs" variant="outline" onClick={handleLogout}>
                  Sair
                </Button>
              </>
            )}
          </Flex>
        </Container>
      </Box>
      <Outlet />
    </Box>
  );
}
