import { Box } from "@chakra-ui/react";
import { Outlet } from "react-router-dom";

export function Root() {
  return (
    <Box minH="100dvh">
      <Outlet />
    </Box>
  );
}
