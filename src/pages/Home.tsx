import { Box, Container, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";

const modules = [
  { tag: "CRM", name: "Clientes", desc: "Cadastro, planos e status dos assinantes." },
  { tag: "NPS", name: "Satisfação", desc: "Pesquisas e índice NPS da operação." },
  { tag: "Equipe", name: "Acessos", desc: "Usuários e papéis dentro da empresa." },
];

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" align="center" gap={4}>
      <Text fontSize="sm" color="#A1A1AA">
        {label}
      </Text>
      <Text fontSize="sm" color="#27272A" fontWeight="500" textAlign="right">
        {value}
      </Text>
    </Flex>
  );
}

export function Home() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Container maxW="5xl" py={{ base: 12, md: 16 }}>
      <Stack gap={2.5} mb={12} animation="fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both">
        <Text
          fontFamily="heading"
          fontSize={{ base: "3xl", md: "4xl" }}
          fontWeight="600"
          letterSpacing="-0.03em"
          lineHeight="1.05"
          color="#1A1A1E"
        >
          Olá, {user.name.split(" ")[0]}.
        </Text>
        <Text fontSize="md" color="#71717A" maxW="lg" lineHeight="1.55">
          Sua sessão está ativa, isolada pela empresa #{user.company_id}. Os módulos
          abaixo operam apenas sobre os dados dela.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 1, lg: 12 }} gap={5}>
        <Box
          gridColumn={{ base: "auto", lg: "span 5" }}
          rounded="xl"
          borderWidth="1px"
          borderColor="rgba(0,0,0,0.08)"
          bg="#FFFFFF"
          p={6}
          animation="fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) 0.05s both"
        >
          <Text fontSize="sm" fontWeight="600" color="#1A1A1E" mb={4}>
            Sessão
          </Text>
          <Stack gap={3}>
            <MetaRow label="Operador" value={user.name} />
            <Box h="1px" bg="rgba(0,0,0,0.06)" />
            <MetaRow label="E-mail" value={user.email} />
            <Box h="1px" bg="rgba(0,0,0,0.06)" />
            <MetaRow label="Empresa" value={`#${user.company_id}`} />
            <Box h="1px" bg="rgba(0,0,0,0.06)" />
            <MetaRow label="Papel" value={user.role} />
          </Stack>
        </Box>

        <Box gridColumn={{ base: "auto", lg: "span 7" }}>
          <Stack gap={3} h="full">
            {modules.map((m, i) => (
              <Flex
                key={m.tag}
                align="center"
                gap={4}
                rounded="xl"
                borderWidth="1px"
                borderColor="rgba(0,0,0,0.08)"
                bg="#FFFFFF"
                px={5}
                py={4}
                transition="border-color 0.18s ease"
                animation={`fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.05}s both`}
                _hover={{ borderColor: "rgba(0,0,0,0.18)" }}
              >
                <Box w="6px" h="6px" rounded="full" bg="#059669" flexShrink={0} />
                <Box flex={1}>
                  <Text fontSize="sm" fontWeight="600" color="#1A1A1E">
                    {m.name}
                  </Text>
                  <Text fontSize="sm" color="#A1A1AA">
                    {m.desc}
                  </Text>
                </Box>
                <Text
                  fontSize="xs"
                  fontWeight="500"
                  color="#A1A1AA"
                  letterSpacing="0.04em"
                >
                  {m.tag}
                </Text>
              </Flex>
            ))}
          </Stack>
        </Box>
      </SimpleGrid>
    </Container>
  );
}
