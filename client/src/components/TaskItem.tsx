import { Button, Checkbox, Flex, Input, Text } from "@chakra-ui/react";
import { useState } from "react";
import type { Task } from "../services/api";

interface Props {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);

  function save() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) {
      onEdit(task.id, trimmed);
    }
    setEditing(false);
  }

  return (
    <Flex align="center" gap={2} borderWidth="1px" borderRadius="md" p={3}>
      <Checkbox.Root checked={task.completed} onCheckedChange={() => onToggle(task)}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
      </Checkbox.Root>

      {editing ? (
        <Input
          flex="1"
          size="sm"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
      ) : (
        <Text
          flex="1"
          textDecoration={task.completed ? "line-through" : "none"}
          color={task.completed ? "fg.muted" : "fg"}
        >
          {task.title}
        </Text>
      )}

      {editing ? (
        <Button size="sm" variant="subtle" onClick={save}>
          Salvar
        </Button>
      ) : (
        <Button
          size="sm"
          variant="subtle"
          onClick={() => {
            setDraft(task.title);
            setEditing(true);
          }}
        >
          Editar
        </Button>
      )}

      <Button
        size="sm"
        colorPalette="red"
        variant="subtle"
        onClick={() => onDelete(task.id)}
      >
        Remover
      </Button>
    </Flex>
  );
}
