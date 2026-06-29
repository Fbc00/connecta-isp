import { Flex, Stack } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";
import { Brand } from "../components/Brand";

export function AuthLayout() {
  return (
    <Flex flex="1" align="center" justify="center" px={5} py={12}>
      <Stack
        gap={8}
        w="full"
        maxW="380px"
        animation="fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both"
      >
        <Flex justify="center">
          <Brand size="lg" />
        </Flex>
        <Outlet />
      </Stack>
    </Flex>
  );
}
