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
    <li>
      <input type="checkbox" checked={task.completed} onChange={() => onToggle(task)} />

      {editing ? (
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
      ) : (
        <span className={`title ${task.completed ? "done" : ""}`}>{task.title}</span>
      )}

      {editing ? (
        <button type="button" className="secondary" onClick={save}>
          Salvar
        </button>
      ) : (
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setDraft(task.title);
            setEditing(true);
          }}
        >
          Editar
        </button>
      )}

      <button type="button" className="danger" onClick={() => onDelete(task.id)}>
        Remover
      </button>
    </li>
  );
}
