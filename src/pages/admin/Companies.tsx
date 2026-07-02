import { Box, Flex, Grid, Spinner, Stack, Text } from "@chakra-ui/react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Card, Page } from "../../components/Page";
import {
  Badge,
  EmptyState,
  ErrorNote,
  GhostButton,
  PrimaryButton,
  TextField,
} from "../../components/ui";
import { adminApi, type Company } from "../../services/adminApi";

const emptyForm = { name: "", adminName: "", adminEmail: "", adminPassword: "" };

export function Companies() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCompanies(await adminApi.listCompanies());
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
    setFormError(null);
    try {
      await adminApi.createCompany(form);
      setForm(emptyForm);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(c: Company) {
    const next = c.status === "active" ? "inactive" : "active";
    try {
      const updated = await adminApi.setStatus(c.id, next);
      setCompanies((prev) =>
        prev ? prev.map((x) => (x.id === updated.id ? updated : x)) : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  return (
    <Page
      title="Empresas"
      subtitle="Cadastre tenants e controle o acesso de cada operação à plataforma."
      actions={
        <PrimaryButton onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Fechar" : "Nova empresa"}
        </PrimaryButton>
      }
    >
      {showForm && (
        <Card p={6} mb={5}>
          <form onSubmit={handleCreate}>
            <Stack gap={4}>
              {formError && <ErrorNote>{formError}</ErrorNote>}
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <TextField
                  label="Nome da empresa"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="Acme ISP"
                  required
                />
                <TextField
                  label="Nome do admin"
                  value={form.adminName}
                  onChange={(v) => setForm({ ...form, adminName: v })}
                  placeholder="Maria Silva"
                  required
                />
                <TextField
                  label="E-mail do admin"
                  type="email"
                  value={form.adminEmail}
                  onChange={(v) => setForm({ ...form, adminEmail: v })}
                  placeholder="admin@acme.com"
                  required
                />
                <TextField
                  label="Senha inicial"
                  type="password"
                  value={form.adminPassword}
                  onChange={(v) => setForm({ ...form, adminPassword: v })}
                  placeholder="mínimo 8 caracteres"
                  required
                />
              </Grid>
              <Flex justify="flex-end">
                <PrimaryButton type="submit" loading={submitting}>
                  Criar empresa
                </PrimaryButton>
              </Flex>
            </Stack>
          </form>
        </Card>
      )}

      {error && (
        <Box mb={4}>
          <ErrorNote>{error}</ErrorNote>
        </Box>
      )}

      <Card overflow="hidden">
        {companies === null ? (
          <Flex justify="center" py={14}>
            <Spinner />
          </Flex>
        ) : companies.length === 0 ? (
          <EmptyState>Nenhuma empresa cadastrada ainda.</EmptyState>
        ) : (
          <Stack gap={0}>
            {companies.map((c, i) => (
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
                  <Flex align="center" gap={2.5}>
                    <Text fontSize="sm" fontWeight="600" color="#1A1A1E" lineClamp={1}>
                      {c.name}
                    </Text>
                    <Badge tone={c.status === "active" ? "green" : "gray"}>
                      {c.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </Flex>
                  <Text fontSize="xs" color="#A1A1AA" mt={0.5}>
                    #{c.id} · {c.users_count} usuário(s) · {c.contacts_count} contato(s)
                  </Text>
                </Box>
                <GhostButton onClick={() => toggle(c)}>
                  {c.status === "active" ? "Desativar" : "Ativar"}
                </GhostButton>
              </Flex>
            ))}
          </Stack>
        )}
      </Card>
    </Page>
  );
}
