import { Button, HStack, Input } from "@chakra-ui/react";
import { type FormEvent, useState } from "react";

interface Props {
  onCreate: (title: string) => void;
  loading?: boolean;
}

export function TaskForm({ onCreate, loading }: Props) {
  const [title, setTitle] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <HStack mb={6}>
        <Input
          placeholder="Nova tarefa..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button type="submit" colorPalette="blue" flexShrink={0} loading={loading}>
          Adicionar
        </Button>
      </HStack>
    </form>
  );
}
