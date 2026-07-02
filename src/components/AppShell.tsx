import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Brand } from "./Brand";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const COMPANY_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/contatos", label: "Contatos" },
  { to: "/campanhas", label: "Campanhas" },
  { to: "/templates", label: "Templates" },
  { to: "/mensagens", label: "Mensagens" },
  { to: "/nps", label: "NPS" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/empresas", label: "Empresas" },
  { to: "/admin/analytics", label: "Analytics" },
];

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink to={item.to} end={item.end}>
      {({ isActive }) => (
        <Box
          px={3}
          py={2}
          rounded="lg"
          fontSize="sm"
          fontWeight="500"
          color={isActive ? "#1A1A1E" : "#52525B"}
          bg={isActive ? "rgba(5,150,105,0.10)" : "transparent"}
          transition="background 0.15s ease, color 0.15s ease"
          _hover={{ bg: isActive ? "rgba(5,150,105,0.12)" : "rgba(0,0,0,0.04)" }}
        >
          {item.label}
        </Box>
      )}
    </NavLink>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/auth/login");
  }

  const isSuper = user?.role === "super_admin";
  const nav = isSuper ? ADMIN_NAV : COMPANY_NAV;

  return (
    <Flex minH="100dvh">
      <Box
        as="aside"
        display={{ base: "none", md: "flex" }}
        flexDirection="column"
        w="240px"
        flexShrink={0}
        borderRightWidth="1px"
        borderColor="rgba(0,0,0,0.07)"
        bg="#FFFFFF"
        position="sticky"
        top={0}
        h="100dvh"
        px={4}
        py={5}
      >
        <Box px={2} mb={7}>
          <Brand />
        </Box>
        <Stack gap={0.5} flex={1}>
          {nav.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </Stack>
        <Box borderTopWidth="1px" borderColor="rgba(0,0,0,0.06)" pt={4} px={2}>
          <Text fontSize="sm" fontWeight="500" color="#1A1A1E" lineClamp={1}>
            {user?.name}
          </Text>
          <Text fontSize="xs" color="#A1A1AA" mb={2.5}>
            {isSuper ? "Plataforma" : `Empresa #${user?.company_id}`} · {user?.role}
          </Text>
          <Button
            size="xs"
            variant="ghost"
            color="#52525B"
            fontWeight="500"
            px={2}
            w="full"
            justifyContent="flex-start"
            _hover={{ bg: "rgba(0,0,0,0.04)", color: "#1A1A1E" }}
            onClick={handleLogout}
          >
            Sair
          </Button>
        </Box>
      </Box>

      <Box flex={1} minW={0} display="flex" flexDirection="column">
        {/* Header mobile: sidebar some, mostra marca + sair no topo */}
        <Flex
          display={{ base: "flex", md: "none" }}
          align="center"
          borderBottomWidth="1px"
          borderColor="rgba(0,0,0,0.07)"
          bg="rgba(251,251,250,0.9)"
          px={5}
          py={3}
        >
          <Brand />
          <Box flex={1} />
          <Button size="xs" variant="ghost" onClick={handleLogout}>
            Sair
          </Button>
        </Flex>
        <Box as="main" flex={1}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
