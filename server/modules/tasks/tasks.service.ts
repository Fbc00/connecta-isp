import { db } from "../../config/db.js";
import type { HttpError } from "../../middlewares/errorHandler.js";

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
}

interface TaskRow {
  id: number;
  title: string;
  completed: number;
  created_at: string;
}

// converte a linha do banco (completed como 0/1) para o formato da API
function toTask(row: TaskRow): Task {
  return { ...row, completed: Boolean(row.completed) };
}

function badRequest(message: string): HttpError {
  const err: HttpError = new Error(message);
  err.status = 400;
  return err;
}

function notFound(): HttpError {
  const err: HttpError = new Error("Tarefa não encontrada");
  err.status = 404;
  return err;
}

export function listTasks(): Task[] {
  const rows = db.prepare("SELECT * FROM tasks ORDER BY id DESC").all() as TaskRow[];
  return rows.map(toTask);
}

export function createTask(title: unknown): Task {
  if (typeof title !== "string" || title.trim() === "") {
    throw badRequest("O título é obrigatório");
  }
  const info = db.prepare("INSERT INTO tasks (title) VALUES (?)").run(title.trim());
  const row = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(info.lastInsertRowid) as TaskRow;
  return toTask(row);
}

export function updateTask(
  id: number,
  data: { title?: unknown; completed?: unknown },
): Task {
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
    | TaskRow
    | undefined;
  if (!existing) throw notFound();

  let title = existing.title;
  if (data.title !== undefined) {
    if (typeof data.title !== "string" || data.title.trim() === "") {
      throw badRequest("O título é obrigatório");
    }
    title = data.title.trim();
  }

  let completed = existing.completed;
  if (data.completed !== undefined) {
    completed = data.completed ? 1 : 0;
  }

  db.prepare("UPDATE tasks SET title = ?, completed = ? WHERE id = ?").run(
    title,
    completed,
    id,
  );
  const row = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskRow;
  return toTask(row);
}

export function deleteTask(id: number): void {
  const info = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  if (info.changes === 0) throw notFound();
}
