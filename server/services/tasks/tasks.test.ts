import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initSchema } from "../../database/db";
import { createTask, deleteTask, listTasks, updateTask } from "./tasks";

const db = createDatabase(nodeSqlite({ name: ":memory:" }));

beforeAll(() => initSchema(db));
afterAll(() => db.dispose());
beforeEach(() => db.sql`DELETE FROM tasks`);

describe("tasks", () => {
  it("cria uma tarefa com completed=false", async () => {
    const task = await createTask(db, "Comprar pão");
    expect(task.id).toBeGreaterThan(0);
    expect(task.title).toBe("Comprar pão");
    expect(task.completed).toBe(false);
  });

  it("rejeita título vazio", async () => {
    await expect(createTask(db, "   ")).rejects.toThrowError(/título/i);
    await expect(createTask(db, 123)).rejects.toThrowError(/título/i);
  });

  it("lista as tarefas (mais recente primeiro)", async () => {
    await createTask(db, "Primeira");
    await createTask(db, "Segunda");
    const tasks = await listTasks(db);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("Segunda");
  });

  it("atualiza título e completed", async () => {
    const created = await createTask(db, "Rascunho");
    const updated = await updateTask(db, created.id, {
      title: "Final",
      completed: true,
    });
    expect(updated.title).toBe("Final");
    expect(updated.completed).toBe(true);
  });

  it("lança 404 ao atualizar id inexistente", async () => {
    await expect(updateTask(db, 9999, { title: "x" })).rejects.toThrowError(
      /não encontrada/i,
    );
  });

  it("remove uma tarefa", async () => {
    const created = await createTask(db, "Apagar");
    await deleteTask(db, created.id);
    expect(await listTasks(db)).toHaveLength(0);
  });

  it("lança 404 ao remover id inexistente", async () => {
    await expect(deleteTask(db, 9999)).rejects.toThrowError(/não encontrada/i);
  });
});
