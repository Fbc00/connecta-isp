import { Box, Flex, Grid, Spinner, Stack, Text, Wrap } from "@chakra-ui/react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Card, Page } from "../components/Page";
import {
  Badge,
  EmptyState,
  ErrorNote,
  GhostButton,
  PrimaryButton,
  TextField,
} from "../components/ui";
import { type Contact, type ContactInput, crmApi } from "../services/crmApi";

const emptyForm: ContactInput = {
  name: "",
  email: "",
  phone: "",
  plan: "basic",
  tags: "",
};

/** Parser CSV simples: cabeçalho name,email,phone,plan,tags (ordem livre). */
function parseCsv(text: string): ContactInput[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const known = ["name", "email", "phone", "plan", "tags"];
  const hasHeader = header.some((h) => known.includes(h));
  const cols = hasHeader ? header : ["name", "email", "phone", "plan", "tags"];
  const body = hasHeader ? lines.slice(1) : lines;
  return body.map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    cols.forEach((c, i) => {
      row[c] = cells[i] ?? "";
    });
    return {
      name: row.name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      plan: row.plan || "basic",
      tags: row.tags ?? "",
    };
  });
}

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ContactInput>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setContacts(await crmApi.list());
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

  function openEdit(c: Contact) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      email: c.email,
      phone: c.phone ?? "",
      plan: c.plan,
      tags: c.tags,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingId != null) await crmApi.update(editingId, form);
      else await crmApi.create(form);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(c: Contact) {
    if (!confirm(`Remover ${c.name}?`)) return;
    try {
      await crmApi.remove(c.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice(null);
    try {
      const rows = parseCsv(await file.text());
      const res = await crmApi.import(rows);
      setNotice(`Importados ${res.created} · ignorados ${res.skipped}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Page
      title="Contatos"
      subtitle="Cadastre e segmente a base de contatos da sua operação."
      actions={
        <Flex gap={2}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            style={{ display: "none" }}
          />
          <GhostButton
            borderWidth="1px"
            borderColor="rgba(0,0,0,0.12)"
            onClick={() => fileRef.current?.click()}
          >
            Importar CSV
          </GhostButton>
          <PrimaryButton onClick={openCreate}>Novo contato</PrimaryButton>
        </Flex>
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
          <form onSubmit={handleSubmit}>
            <Stack gap={4}>
              {formError && <ErrorNote>{formError}</ErrorNote>}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <TextField
                  label="Nome"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  required
                />
                <TextField
                  label="E-mail"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  required
                />
                <TextField
                  label="Telefone"
                  value={form.phone ?? ""}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  placeholder="(11) 90000-0000"
                />
                <TextField
                  label="Plano"
                  value={form.plan ?? ""}
                  onChange={(v) => setForm({ ...form, plan: v })}
                  placeholder="basic"
                />
                <TextField
                  label="Tags (separadas por vírgula)"
                  value={form.tags ?? ""}
                  onChange={(v) => setForm({ ...form, tags: v })}
                  placeholder="fibra, vip"
                />
              </Grid>
              <Flex justify="flex-end" gap={2}>
                <GhostButton type="button" onClick={() => setShowForm(false)}>
                  Cancelar
                </GhostButton>
                <PrimaryButton type="submit" loading={submitting}>
                  {editingId != null ? "Salvar" : "Adicionar"}
                </PrimaryButton>
              </Flex>
            </Stack>
          </form>
        </Card>
      )}

      <Card overflow="hidden">
        {contacts === null ? (
          <Flex justify="center" py={14}>
            <Spinner />
          </Flex>
        ) : contacts.length === 0 ? (
          <EmptyState>Nenhum contato ainda. Adicione ou importe um CSV.</EmptyState>
        ) : (
          <Stack gap={0}>
            {contacts.map((c, i) => (
              <Flex
                key={c.id}
                align="center"
                gap={4}
                px={5}
                py={4}
                borderTopWidth={i === 0 ? "0" : "1px"}
                borderColor="rgba(0,0,0,0.06)"
              >
                <Box flex={1} minW={0}>
                  <Flex align="center" gap={2.5} flexWrap="wrap">
                    <Text fontSize="sm" fontWeight="600" color="#1A1A1E">
                      {c.name}
                    </Text>
                    {c.tags
                      ? c.tags.split(",").map((t) => (
                          <Badge key={t} tone="blue">
                            {t}
                          </Badge>
                        ))
                      : null}
                  </Flex>
                  <Text fontSize="xs" color="#A1A1AA" mt={0.5}>
                    {c.email}
                    {c.phone ? ` · ${c.phone}` : ""} · {c.plan}
                  </Text>
                </Box>
                <Wrap gap={1}>
                  <GhostButton onClick={() => openEdit(c)}>Editar</GhostButton>
                  <GhostButton color="#B91C1C" onClick={() => handleDelete(c)}>
                    Remover
                  </GhostButton>
                </Wrap>
              </Flex>
            ))}
          </Stack>
        )}
      </Card>
    </Page>
  );
}
