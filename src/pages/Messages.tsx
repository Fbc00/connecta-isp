import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Card, Page } from "../components/Page";
import { Badge, EmptyState, ErrorNote } from "../components/ui";
import { type Message, messagesApi } from "../services/messagingApi";

const STATUS_TONE: Record<string, "green" | "red" | "amber" | "gray"> = {
  sent: "green",
  failed: "red",
  queued: "amber",
};

export function Messages() {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    messagesApi
      .list()
      .then(setMessages)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"));
  }, []);

  return (
    <Page title="Mensagens" subtitle="Histórico de disparos e status de entrega.">
      {error && (
        <Box mb={4}>
          <ErrorNote>{error}</ErrorNote>
        </Box>
      )}
      <Card overflow="hidden">
        {messages === null ? (
          <Flex justify="center" py={14}>
            <Spinner />
          </Flex>
        ) : messages.length === 0 ? (
          <EmptyState>Nenhuma mensagem enviada ainda.</EmptyState>
        ) : (
          <Stack gap={0}>
            {messages.map((m, i) => (
              <Flex
                key={m.id}
                align="center"
                gap={4}
                px={5}
                py={4}
                borderTopWidth={i === 0 ? "0" : "1px"}
                borderColor="rgba(0,0,0,0.06)"
              >
                <Box flex={1} minW={0}>
                  <Flex align="center" gap={2.5}>
                    <Badge tone={m.channel === "email" ? "blue" : "amber"}>
                      {m.channel === "email" ? "E-mail" : "SMS"}
                    </Badge>
                    <Text fontSize="sm" fontWeight="600" color="#1A1A1E" lineClamp={1}>
                      {m.subject || m.body}
                    </Text>
                  </Flex>
                  <Text fontSize="xs" color="#A1A1AA" mt={0.5}>
                    contato #{m.customer_id}
                    {m.provider_id ? ` · ${m.provider_id}` : ""}
                  </Text>
                </Box>
                <Badge tone={STATUS_TONE[m.status] ?? "gray"}>{m.status}</Badge>
              </Flex>
            ))}
          </Stack>
        )}
      </Card>
    </Page>
  );
}
