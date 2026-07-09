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
import {
  type Channel,
  type Template,
  type TemplateInput,
  templatesApi,
} from "../services/messagingApi";

const emptyForm: TemplateInput = { channel: "email", subject: "", body: "" };

function ChannelToggle({
  value,
  onChange,
}: {
  value: Channel;
  onChange: (c: Channel) => void;
}) {
  const opts: Channel[] = ["email", "sms"];
  return (
    <Flex gap={1} p={1} rounded="lg" bg="rgba(0,0,0,0.04)" w="fit-content">
      {opts.map((o) => (
        <Pressable
          key={o}
          type="button"
          px={4}
          py={1.5}
          rounded="md"
          fontSize="sm"
          fontWeight="500"
          bg={value === o ? "#FFFFFF" : "transparent"}
          color={value === o ? "#1A1A1E" : "#71717A"}
          boxShadow={value === o ? "0 1px 2px rgba(0,0,0,0.08)" : "none"}
          onClick={() => onChange(o)}
        >
          {o === "email" ? "E-mail" : "SMS"}
        </Pressable>
      ))}
    </Flex>
  );
}

export function Templates() {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setTemplates(await templatesApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditingId(t.id);
    setForm({ channel: t.channel, subject: t.subject, body: t.body });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId != null) await templatesApi.update(editingId, form);
      else await templatesApi.create(form);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm("Remover este template?")) return;
    try {
      await templatesApi.remove(t.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover");
    }
  }

  return (
    <Page
      title="Templates"
      subtitle="Modelos de mensagem reutilizáveis. Use {{name}} e {{email}} para personalizar."
      actions={<PrimaryButton onClick={openCreate}>Novo template</PrimaryButton>}
    >
      {error && (
        <Box mb={4}>
          <ErrorNote>{error}</ErrorNote>
        </Box>
      )}

      {showForm && (
        <Card p={6} mb={5}>
          <form onSubmit={handleSubmit}>
            <Stack gap={4}>
              {formError && <ErrorNote>{formError}</ErrorNote>}
              <Box>
                <Text fontSize="sm" fontWeight="500" color="#3F3F46" mb={2}>
                  Canal
                </Text>
                <ChannelToggle
                  value={form.channel}
                  onChange={(c) => setForm({ ...form, channel: c })}
                />
              </Box>
              {form.channel === "email" && (
                <TextField
                  label="Assunto"
                  value={form.subject}
                  onChange={(v) => setForm({ ...form, subject: v })}
                  placeholder="Novidades para {{name}}"
                />
              )}
              <TextField
                label="Corpo"
                as="textarea"
                value={form.body}
                onChange={(v) => setForm({ ...form, body: v })}
                placeholder="Olá {{name}}, ..."
                required
              />
              <Flex justify="flex-end" gap={2}>
                <GhostButton type="button" onClick={() => setShowForm(false)}>
                  Cancelar
                </GhostButton>
                <PrimaryButton type="submit" loading={submitting}>
                  {editingId != null ? "Salvar" : "Criar"}
                </PrimaryButton>
              </Flex>
            </Stack>
          </form>
        </Card>
      )}

      <Card overflow="hidden">
        {templates === null ? (
          <Flex justify="center" py={14}>
            <Spinner />
          </Flex>
        ) : templates.length === 0 ? (
          <EmptyState>Nenhum template ainda.</EmptyState>
        ) : (
          <Stack gap={0}>
            {templates.map((t, i) => (
              <Flex
                key={t.id}
                align="center"
                gap={4}
                px={5}
                py={4}
                borderTopWidth={i === 0 ? "0" : "1px"}
                borderColor="rgba(0,0,0,0.06)"
              >
                <Box flex={1} minW={0}>
                  <Flex align="center" gap={2.5}>
                    <Badge tone={t.channel === "email" ? "blue" : "amber"}>
                      {t.channel === "email" ? "E-mail" : "SMS"}
                    </Badge>
                    <Text fontSize="sm" fontWeight="600" color="#1A1A1E" lineClamp={1}>
                      {t.subject || "(sem assunto)"}
                    </Text>
                  </Flex>
                  <Text fontSize="xs" color="#A1A1AA" mt={0.5} lineClamp={1}>
                    {t.body}
                  </Text>
                </Box>
                <Flex gap={1}>
                  <GhostButton onClick={() => openEdit(t)}>Editar</GhostButton>
                  <GhostButton color="#B91C1C" onClick={() => handleDelete(t)}>
                    Remover
                  </GhostButton>
                </Flex>
              </Flex>
            ))}
          </Stack>
        )}
      </Card>
    </Page>
  );
}
