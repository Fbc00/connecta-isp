import { Box, Button, Field, Input, Stack, Text } from "@chakra-ui/react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextLink } from "../components/ui";
import { useAuth } from "../context/AuthContext";

const labelProps = {
  fontSize: "sm",
  fontWeight: "500",
  color: "#3F3F46",
} as const;

const inputProps = {
  h: "44px",
  rounded: "lg",
  bg: "#FFFFFF",
  borderWidth: "1px",
  borderColor: "rgba(0,0,0,0.12)",
  color: "#1A1A1E",
  fontSize: "sm",
  px: 3.5,
  _placeholder: { color: "#A1A1AA" },
  _hover: { borderColor: "rgba(0,0,0,0.2)" },
  _focusVisible: {
    borderColor: "#059669",
    boxShadow: "0 0 0 3px rgba(5,150,105,0.14)",
    outline: "none",
  },
} as const;

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: "",
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      rounded="xl"
      borderWidth="1px"
      borderColor="rgba(0,0,0,0.08)"
      bg="#FFFFFF"
      p={{ base: 7, sm: 8 }}
      boxShadow="0 1px 2px rgba(0,0,0,0.04), 0 12px 32px -16px rgba(0,0,0,0.12)"
    >
      <Stack gap={1} mb={6}>
        <Text fontFamily="heading" fontSize="xl" fontWeight="600" color="#1A1A1E">
          Criar conta
        </Text>
        <Text fontSize="sm" color="#71717A">
          Cadastre sua empresa e comece a operar.
        </Text>
      </Stack>

      <form onSubmit={handleSubmit}>
        <Stack gap={4.5}>
          {error && (
            <Box
              rounded="lg"
              borderWidth="1px"
              borderColor="rgba(220,38,38,0.2)"
              bg="rgba(220,38,38,0.05)"
              px={3.5}
              py={2.5}
            >
              <Text fontSize="sm" color="#B91C1C">
                {error}
              </Text>
            </Box>
          )}

          <Field.Root>
            <Field.Label {...labelProps}>Empresa</Field.Label>
            <Input
              placeholder="Acme ISP"
              value={form.companyName}
              onChange={set("companyName")}
              {...inputProps}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label {...labelProps}>Seu nome</Field.Label>
            <Input
              autoComplete="name"
              placeholder="Maria Silva"
              value={form.name}
              onChange={set("name")}
              {...inputProps}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label {...labelProps}>E-mail</Field.Label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com"
              value={form.email}
              onChange={set("email")}
              {...inputProps}
            />
          </Field.Root>

          <Field.Root>
            <Field.Label {...labelProps}>Senha</Field.Label>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="mínimo 8 caracteres"
              value={form.password}
              onChange={set("password")}
              {...inputProps}
            />
          </Field.Root>

          <Button
            type="submit"
            loading={loading}
            h="44px"
            mt={1}
            rounded="lg"
            fontWeight="600"
            fontSize="sm"
            color="#FFFFFF"
            bg="#1A1A1E"
            transition="background 0.15s ease"
            _hover={{ bg: "#000000" }}
          >
            Criar conta
          </Button>

          <Text fontSize="sm" color="#71717A" textAlign="center">
            Já tem conta?{" "}
            <TextLink to="/auth/login" _hover={{ textDecoration: "underline" }}>
              Entrar
            </TextLink>
          </Text>
        </Stack>
      </form>
    </Box>
  );
}
