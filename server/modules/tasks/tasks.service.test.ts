import { beforeEach, describe, expect, it } from "bun:test";
import { db } from "../../config/db.js";
import { createTask, deleteTask, listTasks, updateTask } from "./tasks.service.js";

beforeEach(() => {
  db.exec("DELETE FROM tasks");
});

describe("tasks.service", () => {
  it("cria uma tarefa com completed=false", () => {
    const task = createTask("Comprar pão");
    expect(task.id).toBeGreaterThan(0);
    expect(task.title).toBe("Comprar pão");
    expect(task.completed).toBe(false);
  });

  it("rejeita título vazio", () => {
    expect(() => createTask("   ")).toThrowError(/título/i);
    expect(() => createTask(123)).toThrowError(/título/i);
  });

  it("lista as tarefas (mais recente primeiro)", () => {
    createTask("Primeira");
    createTask("Segunda");
    const tasks = listTasks();
    expect(tasks).toHaveLength(2);
    expect(tasks[0].title).toBe("Segunda");
  });

  it("atualiza título e completed", () => {
    const created = createTask("Rascunho");
    const updated = updateTask(created.id, { title: "Final", completed: true });
    expect(updated.title).toBe("Final");
    expect(updated.completed).toBe(true);
  });

  it("lança 404 ao atualizar id inexistente", () => {
    expect(() => updateTask(9999, { title: "x" })).toThrowError(/não encontrada/i);
  });

  it("remove uma tarefa", () => {
    const created = createTask("Apagar");
    deleteTask(created.id);
    expect(listTasks()).toHaveLength(0);
  });

  it("lança 404 ao remover id inexistente", () => {
    expect(() => deleteTask(9999)).toThrowError(/não encontrada/i);
  });
});
