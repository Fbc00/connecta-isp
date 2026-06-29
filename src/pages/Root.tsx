import { Box, Button, Container, Flex, Link, Spacer, Text } from "@chakra-ui/react";
import { Outlet, Link as RouterLink, useNavigate } from "react-router-dom";
import { Brand } from "../components/Brand";
import { useAuth } from "../context/AuthContext";

export function Root() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/auth/login");
  }

  return (
    <Box minH="100dvh" display="flex" flexDirection="column">
      <Box
        as="header"
        position="sticky"
        top={0}
        zIndex={10}
        borderBottomWidth="1px"
        borderColor="rgba(0,0,0,0.07)"
        bg="rgba(251,251,250,0.8)"
        backdropFilter="blur(8px)"
      >
        <Container maxW="5xl" py={4}>
          <Flex align="center" gap={4}>
            <Link asChild _hover={{ textDecoration: "none", opacity: 0.7 }}>
              <RouterLink to="/">
                <Brand />
              </RouterLink>
            </Link>
            <Spacer />
            {user ? (
              <Flex align="center" gap={5}>
                <Text
                  fontSize="sm"
                  color="#52525B"
                  display={{ base: "none", sm: "block" }}
                >
                  {user.name}
                  <Box as="span" color="#A1A1AA">
                    {" · "}
                    {user.role}
                  </Box>
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  color="#52525B"
                  fontWeight="500"
                  px={2}
                  _hover={{ bg: "rgba(0,0,0,0.04)", color: "#1A1A1E" }}
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </Flex>
            ) : (
              <Link asChild>
                <RouterLink to="/auth/login">
                  <Text fontSize="sm" fontWeight="500" color="#52525B">
                    Login
                  </Text>
                </RouterLink>
              </Link>
            )}
          </Flex>
        </Container>
      </Box>
      <Box as="main" flex="1" display="flex" flexDirection="column">
        <Outlet />
      </Box>
    </Box>
  );
}
