import { Flex, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, Page } from "../components/Page";
import { useAuth } from "../context/AuthContext";
import { type DashboardSummary, dashboardApi } from "../services/dashboardApi";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card p={5}>
      <Text fontSize="xs" fontWeight="600" letterSpacing="0.04em" color="#A1A1AA">
        {label.toUpperCase()}
      </Text>
      <Text
        fontFamily="heading"
        fontSize="3xl"
        fontWeight="600"
        letterSpacing="-0.02em"
        color="#1A1A1E"
        mt={1}
        lineHeight="1.1"
      >
        {value}
      </Text>
      {hint && (
        <Text fontSize="xs" color="#A1A1AA" mt={1}>
          {hint}
        </Text>
      )}
    </Card>
  );
}

const links = [
  { to: "/contatos", name: "Contatos", desc: "Gerencie sua base." },
  { to: "/campanhas", name: "Campanhas", desc: "Dispare email/SMS." },
  { to: "/nps", name: "NPS", desc: "Meça satisfação." },
];

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "super_admin") return;
    dashboardApi
      .summary()
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro"));
  }, [user]);

  if (!user) return null;
  if (user.role === "super_admin") return <Navigate to="/admin/empresas" replace />;

  return (
    <Page
      title={`Olá, ${user.name.split(" ")[0]}.`}
      subtitle={`Painel da empresa #${user.company_id}. Os números abaixo refletem apenas os dados dela.`}
    >
      {error && (
        <Text fontSize="sm" color="#B91C1C" mb={4}>
          {error}
        </Text>
      )}

      {summary === null ? (
        <Flex justify="center" py={14}>
          <Spinner />
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4} mb={5}>
          <Stat label="Contatos" value={String(summary.contacts)} />
          <Stat label="Mensagens" value={String(summary.messages_sent)} hint="enviadas" />
          <Stat label="Pesquisas" value={String(summary.surveys)} hint="NPS criadas" />
          <Stat
            label="NPS"
            value={String(summary.nps)}
            hint={summary.nps >= 0 ? "índice atual" : "índice atual"}
          />
        </SimpleGrid>
      )}

      <SimpleGrid columns={{ base: 1, sm: 3 }} gap={3}>
        {links.map((l) => (
          <Card
            key={l.to}
            p={5}
            cursor="pointer"
            transition="border-color 0.18s ease"
            _hover={{ borderColor: "rgba(0,0,0,0.18)" }}
            onClick={() => navigate(l.to)}
          >
            <Stack gap={0.5}>
              <Text fontSize="sm" fontWeight="600" color="#1A1A1E">
                {l.name}
              </Text>
              <Text fontSize="sm" color="#A1A1AA">
                {l.desc}
              </Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Page>
  );
}
