import { Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({ companyName, name, email, password });
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        {error && <Text color="red.500">{error}</Text>}

        <Field.Root>
          <Field.Label>Empresa</Field.Label>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        </Field.Root>

        <Field.Root>
          <Field.Label>Nome</Field.Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field.Root>

        <Field.Root>
          <Field.Label>E-mail</Field.Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field.Root>

        <Field.Root>
          <Field.Label>Senha</Field.Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field.Root>

        <Button type="submit" colorPalette="blue" loading={loading}>
          Criar conta
        </Button>
      </Stack>
    </form>
  );
}
