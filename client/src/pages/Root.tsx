import { Box, Container, Flex, Link } from "@chakra-ui/react";
import { Outlet, Link as RouterLink } from "react-router-dom";

export function Root() {
  return (
    <Box>
      <Box as="nav" borderBottomWidth="1px" bg="bg.subtle">
        <Container maxW="lg" py={3}>
          <Flex gap={4}>
            <Link asChild fontWeight="medium">
              <RouterLink to="/">Home</RouterLink>
            </Link>
            <Link asChild fontWeight="medium">
              <RouterLink to="/auth/login">Login</RouterLink>
            </Link>
          </Flex>
        </Container>
      </Box>

      <Outlet />
    </Box>
  );
}
