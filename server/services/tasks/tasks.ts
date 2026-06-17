import type { Database } from "db0";
import { createError } from "h3";

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

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const notFound = () => createError({ statusCode: 404, message: "Tarefa não encontrada" });

export async function listTasks(db: Database): Promise<Task[]> {
  const { rows } = await db.sql`SELECT * FROM tasks ORDER BY id DESC`;
  return (rows as unknown as TaskRow[]).map(toTask);
}

export async function createTask(db: Database, title: unknown): Promise<Task> {
  if (typeof title !== "string" || title.trim() === "") {
    throw badRequest("O título é obrigatório");
  }
  const { lastInsertRowid } = await db.sql`
    INSERT INTO tasks (title) VALUES (${title.trim()})
  `;
  return getById(db, Number(lastInsertRowid));
}

export async function updateTask(
  db: Database,
  id: number,
  data: { title?: unknown; completed?: unknown },
): Promise<Task> {
  const existing = await findRow(db, id);
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

  await db.sql`
    UPDATE tasks SET title = ${title}, completed = ${completed} WHERE id = ${id}
  `;
  return getById(db, id);
}

export async function deleteTask(db: Database, id: number): Promise<void> {
  const { changes } = await db.sql`DELETE FROM tasks WHERE id = ${id}`;
  if (!changes) throw notFound();
}

async function findRow(db: Database, id: number): Promise<TaskRow | undefined> {
  const { rows } = await db.sql`SELECT * FROM tasks WHERE id = ${id}`;
  return (rows as unknown as TaskRow[])[0];
}

async function getById(db: Database, id: number): Promise<Task> {
  const row = await findRow(db, id);
  if (!row) throw notFound();
  return toTask(row);
}
