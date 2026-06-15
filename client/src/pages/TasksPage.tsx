import { Container, Heading, Stack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { TaskForm } from "../components/TaskForm";
import { TaskItem } from "../components/TaskItem";
import { type Task, tasksApi } from "../services/api";

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);

  async function run(action: () => Promise<unknown>) {
    setLoadingAction(true);
    try {
      setError(null);
      await action();
      setTasks(await tasksApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoadingAction(false);
    }
  }

  useEffect(() => {
    tasksApi
      .list()
      .then(setTasks)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro inesperado"));
  }, []);

  return (
    <Container maxW="lg" py={8}>
      <Heading size="lg" mb={6}>
        Tarefas
      </Heading>

      {error && (
        <Text color="red.500" mb={4}>
          {error}
        </Text>
      )}

      <TaskForm
        loading={loadingAction}
        onCreate={(title) => run(() => tasksApi.create(title))}
      />

      {tasks.length === 0 ? (
        <Text color="fg.muted">Nenhuma tarefa ainda.</Text>
      ) : (
        <Stack gap={2}>
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
        </Stack>
      )}
    </Container>
  );
}
