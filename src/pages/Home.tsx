import { Card, Container, Heading, Stack, Text } from "@chakra-ui/react";
import { useAuth } from "../context/AuthContext";

// dashboard mínimo pós-login — confirma sessão e escopo de empresa ativos
export function Home() {
  const { user } = useAuth();

  return (
    <Container maxW="lg" py={8}>
      <Heading size="lg" mb={6}>
        Connecta ISP
      </Heading>

      {user && (
        <Card.Root>
          <Card.Body>
            <Stack gap={1}>
              <Text>
                Olá, <strong>{user.name}</strong>
              </Text>
              <Text color="fg.muted" fontSize="sm">
                Empresa #{user.company_id} · perfil {user.role}
              </Text>
            </Stack>
          </Card.Body>
        </Card.Root>
      )}
    </Container>
  );
}
