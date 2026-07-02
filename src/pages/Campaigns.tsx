import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { Card, Page } from "../components/Page";
import {
  Badge,
  EmptyState,
  ErrorNote,
  GhostButton,
  Pressable,
  PrimaryButton,
  TextLink,
} from "../components/ui";
import { type Contact, crmApi } from "../services/crmApi";
import { campaignsApi, type Template, templatesApi } from "../services/messagingApi";

export function Campaigns() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([templatesApi.list(), crmApi.list()])
      .then(([t, c]) => {
        setTemplates(t);
        setContacts(c);
        if (t.length) setTemplateId(t[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"));
  }, []);

  const allSelected = useMemo(
    () => !!contacts && contacts.length > 0 && selected.size === contacts.length,
    [contacts, selected],
  );

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!contacts) return;
    setSelected(allSelected ? new Set() : new Set(contacts.map((c) => c.id)));
  }

  async function handleSend() {
    if (templateId == null || selected.size === 0) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const r = await campaignsApi.dispatch(templateId, [...selected]);
      setResult(`${r.sent} enviada(s), ${r.failed} falha(s) de ${r.total}.`);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao disparar");
    } finally {
      setSending(false);
    }
  }

  const loading = templates === null || contacts === null;

  return (
    <Page
      title="Campanhas"
      subtitle="Escolha um template, selecione os contatos e dispare."
    >
      {error && (
        <Box mb={4}>
          <ErrorNote>{error}</ErrorNote>
        </Box>
      )}
      {result && (
        <Box mb={4}>
          <Badge tone="green">{result}</Badge>{" "}
          <TextLink to="/mensagens" fontSize="sm">
            ver mensagens
          </TextLink>
        </Box>
      )}

      {loading ? (
        <Flex justify="center" py={14}>
          <Spinner />
        </Flex>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState>
            Crie um <TextLink to="/templates">template</TextLink> antes de disparar uma
            campanha.
          </EmptyState>
        </Card>
      ) : (
        <Stack gap={5}>
          <Card p={6}>
            <Text fontSize="sm" fontWeight="600" color="#1A1A1E" mb={3}>
              Template
            </Text>
            <Stack gap={2}>
              {templates.map((t) => (
                <Pressable
                  key={t.id}
                  type="button"
                  display="flex"
                  alignItems="center"
                  gap={3}
                  px={4}
                  py={3}
                  rounded="lg"
                  borderWidth="1px"
                  borderColor={templateId === t.id ? "#059669" : "rgba(0,0,0,0.1)"}
                  bg={templateId === t.id ? "rgba(5,150,105,0.05)" : "#FFFFFF"}
                  onClick={() => setTemplateId(t.id)}
                >
                  <Badge tone={t.channel === "email" ? "blue" : "amber"}>
                    {t.channel === "email" ? "E-mail" : "SMS"}
                  </Badge>
                  <Text fontSize="sm" color="#1A1A1E" lineClamp={1}>
                    {t.subject || t.body}
                  </Text>
                </Pressable>
              ))}
            </Stack>
          </Card>

          <Card overflow="hidden">
            <Flex
              align="center"
              px={5}
              py={3.5}
              borderBottomWidth="1px"
              borderColor="rgba(0,0,0,0.06)"
            >
              <Text fontSize="sm" fontWeight="600" color="#1A1A1E" flex={1}>
                Contatos ({selected.size} selecionado{selected.size === 1 ? "" : "s"})
              </Text>
              {contacts.length > 0 && (
                <GhostButton onClick={toggleAll}>
                  {allSelected ? "Limpar" : "Selecionar todos"}
                </GhostButton>
              )}
            </Flex>
            {contacts.length === 0 ? (
              <EmptyState>Nenhum contato para enviar.</EmptyState>
            ) : (
              <Stack gap={0} maxH="360px" overflowY="auto">
                {contacts.map((c) => (
                  <Pressable
                    key={c.id}
                    type="button"
                    display="flex"
                    alignItems="center"
                    gap={3}
                    px={5}
                    py={3}
                    borderTopWidth="1px"
                    borderColor="rgba(0,0,0,0.05)"
                    onClick={() => toggle(c.id)}
                    _hover={{ bg: "rgba(0,0,0,0.02)" }}
                  >
                    <Box
                      w="16px"
                      h="16px"
                      rounded="sm"
                      borderWidth="1px"
                      borderColor={selected.has(c.id) ? "#059669" : "rgba(0,0,0,0.25)"}
                      bg={selected.has(c.id) ? "#059669" : "transparent"}
                      flexShrink={0}
                    />
                    <Box flex={1} minW={0}>
                      <Text fontSize="sm" color="#1A1A1E">
                        {c.name}
                      </Text>
                      <Text fontSize="xs" color="#A1A1AA">
                        {c.email}
                      </Text>
                    </Box>
                  </Pressable>
                ))}
              </Stack>
            )}
          </Card>

          <Flex justify="flex-end">
            <PrimaryButton
              loading={sending}
              disabled={selected.size === 0 || templateId == null}
              onClick={handleSend}
            >
              Disparar para {selected.size}
            </PrimaryButton>
          </Flex>
        </Stack>
      )}
    </Page>
  );
}
