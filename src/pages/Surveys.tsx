import { Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Card, Page } from "../components/Page";
import {
  Badge,
  EmptyState,
  ErrorNote,
  GhostButton,
  Pressable,
  PrimaryButton,
  TextField,
} from "../components/ui";
import { type Contact, crmApi } from "../services/crmApi";
import { npsApi, type Survey } from "../services/npsApi";

function ScoreBar({ score }: { score: Survey["score"] }) {
  const total = score.total || 1;
  const seg = [
    { n: score.detractors, color: "#DC2626" },
    { n: score.passives, color: "#D97706" },
    { n: score.promoters, color: "#059669" },
  ];
  return (
    <Flex h="8px" rounded="full" overflow="hidden" bg="rgba(0,0,0,0.05)" w="full">
      {seg.map((s) => (
        <Box key={s.color} w={`${(s.n / total) * 100}%`} bg={s.color} />
      ))}
    </Flex>
  );
}

function InvitePanel({
  survey,
  onDone,
}: {
  survey: Survey;
  onDone: (msg: string) => void;
}) {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    crmApi
      .list()
      .then(setContacts)
      .catch(() => setContacts([]));
  }, []);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function send() {
    setSending(true);
    setError(null);
    try {
      const r = await npsApi.sendInvites(survey.id, [...selected], channel);
      onDone(`${r.sent} convite(s) enviado(s), ${r.failed} falha(s).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <Box mt={4} pt={4} borderTopWidth="1px" borderColor="rgba(0,0,0,0.06)">
      {error && (
        <Box mb={3}>
          <ErrorNote>{error}</ErrorNote>
        </Box>
      )}
      <Flex gap={1} p={1} rounded="lg" bg="rgba(0,0,0,0.04)" w="fit-content" mb={3}>
        {(["email", "sms"] as const).map((o) => (
          <Pressable
            key={o}
            type="button"
            px={4}
            py={1.5}
            rounded="md"
            fontSize="sm"
            fontWeight="500"
            bg={channel === o ? "#FFFFFF" : "transparent"}
            color={channel === o ? "#1A1A1E" : "#71717A"}
            onClick={() => setChannel(o)}
          >
            {o === "email" ? "E-mail" : "SMS"}
          </Pressable>
        ))}
      </Flex>
      {contacts === null ? (
        <Spinner size="sm" />
      ) : (
        <Stack gap={0} maxH="220px" overflowY="auto" mb={3}>
          {contacts.map((c) => (
            <Pressable
              key={c.id}
              type="button"
              display="flex"
              alignItems="center"
              gap={3}
              py={2}
              onClick={() => toggle(c.id)}
            >
              <Box
                w="15px"
                h="15px"
                rounded="sm"
                borderWidth="1px"
                borderColor={selected.has(c.id) ? "#059669" : "rgba(0,0,0,0.25)"}
                bg={selected.has(c.id) ? "#059669" : "transparent"}
              />
              <Text fontSize="sm" color="#1A1A1E">
                {c.name}
              </Text>
              <Text fontSize="xs" color="#A1A1AA">
                {c.email}
              </Text>
            </Pressable>
          ))}
        </Stack>
      )}
      <Flex justify="flex-end">
        <PrimaryButton
          size="sm"
          loading={sending}
          disabled={selected.size === 0}
          onClick={send}
        >
          Enviar {selected.size} convite(s)
        </PrimaryButton>
      </Flex>
    </Box>
  );
}

export function Surveys() {
  const [surveys, setSurveys] = useState<Survey[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", question: "" });
  const [submitting, setSubmitting] = useState(false);
  const [inviteFor, setInviteFor] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSurveys(await npsApi.listSurveys());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await npsApi.createSurvey(form);
      setForm({ title: "", question: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(s: Survey) {
    try {
      await npsApi.setStatus(s.id, s.status === "active" ? "closed" : "active");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  return (
    <Page
      title="NPS"
      subtitle="Crie pesquisas, envie convites e acompanhe o índice de satisfação."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Fechar" : "Nova pesquisa"}
        </PrimaryButton>
      }
    >
      {notice && (
        <Box mb={4}>
          <Badge tone="green">{notice}</Badge>
        </Box>
      )}
      {error && (
        <Box mb={4}>
          <ErrorNote>{error}</ErrorNote>
        </Box>
      )}

      {showForm && (
        <Card p={6} mb={5}>
          <form onSubmit={handleCreate}>
            <Stack gap={4}>
              <TextField
                label="Título"
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
                placeholder="Satisfação Q3"
                required
              />
              <TextField
                label="Pergunta (opcional)"
                value={form.question}
                onChange={(v) => setForm({ ...form, question: v })}
                placeholder="De 0 a 10, o quanto você recomendaria a gente?"
              />
              <Flex justify="flex-end">
                <PrimaryButton type="submit" loading={submitting}>
                  Criar pesquisa
                </PrimaryButton>
              </Flex>
            </Stack>
          </form>
        </Card>
      )}

      {surveys === null ? (
        <Flex justify="center" py={14}>
          <Spinner />
        </Flex>
      ) : surveys.length === 0 ? (
        <Card>
          <EmptyState>Nenhuma pesquisa criada ainda.</EmptyState>
        </Card>
      ) : (
        <Stack gap={4}>
          {surveys.map((s) => (
            <Card key={s.id} p={6}>
              <Flex align="flex-start" gap={4}>
                <Box flex={1} minW={0}>
                  <Flex align="center" gap={2.5} mb={1}>
                    <Text fontSize="md" fontWeight="600" color="#1A1A1E">
                      {s.title}
                    </Text>
                    <Badge tone={s.status === "active" ? "green" : "gray"}>
                      {s.status === "active" ? "Ativa" : "Fechada"}
                    </Badge>
                  </Flex>
                  <Text fontSize="sm" color="#71717A">
                    {s.question}
                  </Text>
                </Box>
                <Box textAlign="right" flexShrink={0}>
                  <Text
                    fontFamily="heading"
                    fontSize="3xl"
                    fontWeight="600"
                    color="#1A1A1E"
                    lineHeight="1"
                  >
                    {s.score.nps}
                  </Text>
                  <Text fontSize="xs" color="#A1A1AA">
                    NPS · {s.score.total} resp.
                  </Text>
                </Box>
              </Flex>

              <Box mt={4}>
                <ScoreBar score={s.score} />
                <Flex gap={4} mt={2}>
                  <Text fontSize="xs" color="#059669">
                    ● {s.score.promoters} promotores
                  </Text>
                  <Text fontSize="xs" color="#D97706">
                    ● {s.score.passives} neutros
                  </Text>
                  <Text fontSize="xs" color="#DC2626">
                    ● {s.score.detractors} detratores
                  </Text>
                </Flex>
              </Box>

              <Flex gap={2} mt={4}>
                <GhostButton
                  borderWidth="1px"
                  borderColor="rgba(0,0,0,0.12)"
                  onClick={() => setInviteFor(inviteFor === s.id ? null : s.id)}
                >
                  {inviteFor === s.id ? "Fechar" : "Enviar convites"}
                </GhostButton>
                <GhostButton onClick={() => toggleStatus(s)}>
                  {s.status === "active" ? "Fechar" : "Reabrir"}
                </GhostButton>
              </Flex>

              {inviteFor === s.id && (
                <InvitePanel
                  survey={s}
                  onDone={(msg) => {
                    setNotice(msg);
                    setInviteFor(null);
                    load();
                  }}
                />
              )}
            </Card>
          ))}
        </Stack>
      )}
    </Page>
  );
}
