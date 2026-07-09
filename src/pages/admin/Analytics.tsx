import { Box, Flex, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Card, Page } from "../../components/Page";
import { Badge, EmptyState, ErrorNote } from "../../components/ui";
import {
  type AuditEntry,
  adminApi,
  type PlatformAnalytics,
} from "../../services/adminApi";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card p={5}>
      <Text fontSize="xs" fontWeight="600" letterSpacing="0.04em" color="#A1A1AA">
        {label.toUpperCase()}
      </Text>
      <Text
        fontFamily="heading"
        fontSize="3xl"
        fontWeight="600"
        color="#1A1A1E"
        mt={1}
        lineHeight="1.1"
      >
        {value}
      </Text>
    </Card>
  );
}

const ACTION_TONE: Record<string, "green" | "blue" | "amber" | "gray"> = {
  "auth.login": "gray",
  "auth.register": "blue",
  "company.create": "green",
  "company.status": "amber",
  "campaign.dispatch": "blue",
  "nps.invite": "amber",
};

export function Analytics() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([adminApi.analytics(), adminApi.audit()])
      .then(([a, l]) => {
        setData(a);
        setAudit(l);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"));
  }, []);

  return (
    <Page title="Analytics" subtitle="Visão geral da plataforma e registro de auditoria.">
      {error && (
        <Box mb={4}>
          <ErrorNote>{error}</ErrorNote>
        </Box>
      )}

      {data === null ? (
        <Flex justify="center" py={14}>
          <Spinner />
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 2, md: 3 }} gap={4} mb={6}>
          <Stat label="Empresas" value={data.companies} />
          <Stat label="Ativas" value={data.active_companies} />
          <Stat label="Usuários" value={data.users} />
          <Stat label="Contatos" value={data.contacts} />
          <Stat label="Mensagens" value={data.messages} />
          <Stat label="Respostas NPS" value={data.responses} />
        </SimpleGrid>
      )}

      <Text fontSize="sm" fontWeight="600" color="#1A1A1E" mb={3}>
        Auditoria recente
      </Text>
      <Card overflow="hidden">
        {audit === null ? (
          <Flex justify="center" py={10}>
            <Spinner />
          </Flex>
        ) : audit.length === 0 ? (
          <EmptyState>Sem eventos registrados.</EmptyState>
        ) : (
          <Stack gap={0}>
            {audit.map((e, i) => (
              <Flex
                key={e.id}
                align="center"
                gap={3}
                px={5}
                py={3}
                borderTopWidth={i === 0 ? "0" : "1px"}
                borderColor="rgba(0,0,0,0.06)"
              >
                <Badge tone={ACTION_TONE[e.action] ?? "gray"}>{e.action}</Badge>
                <Text fontSize="sm" color="#52525B" flex={1} minW={0} lineClamp={1}>
                  {e.detail}
                </Text>
                <Text fontSize="xs" color="#A1A1AA" flexShrink={0}>
                  {e.created_at}
                </Text>
              </Flex>
            ))}
          </Stack>
        )}
      </Card>
    </Page>
  );
}
