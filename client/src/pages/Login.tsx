import { Button, Field, Input, Stack } from "@chakra-ui/react";
import { type FormEvent, useState } from "react";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // layout básico — sem autenticação real
    console.log("login", { email, password });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
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

        <Button type="submit" colorPalette="blue">
          Entrar
        </Button>
      </Stack>
    </form>
  );
}
