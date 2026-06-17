import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { updateTask } from "../../services/tasks/tasks";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ title?: unknown; completed?: unknown }>(event);
  return updateTask(useDatabase(), id, {
    title: body?.title,
    completed: body?.completed,
  });
});
