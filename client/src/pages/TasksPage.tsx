import { useEffect, useState } from "react";
import { TaskForm } from "../components/TaskForm";
import { TaskItem } from "../components/TaskItem";
import { type Task, tasksApi } from "../services/api";

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    try {
      setError(null);
      await action();
      setTasks(await tasksApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    }
  }

  useEffect(() => {
    tasksApi
      .list()
      .then(setTasks)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, []);

  return (
    <main>
      <h1>Tarefas</h1>

      {error && <p className="error">{error}</p>}

      <TaskForm onCreate={(title) => run(() => tasksApi.create(title))} />

      {tasks.length === 0 ? (
        <p>Nenhuma tarefa ainda.</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={(t) =>
                run(() => tasksApi.update(t.id, { completed: !t.completed }))
              }
              onEdit={(id, title) => run(() => tasksApi.update(id, { title }))}
              onDelete={(id) => run(() => tasksApi.remove(id))}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
