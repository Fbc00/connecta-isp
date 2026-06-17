import { Button, Field, Input, Stack } from "@chakra-ui/react";
import { type FormEvent, useState } from "react";

export function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // layout básico — sem cadastro real
    console.log("register", { name, email, password });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
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

        <Button type="submit" colorPalette="blue">
          Criar conta
        </Button>
      </Stack>
    </form>
  );
}
