import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { useDatabase } from "nitro/database";
import { createTask } from "../../services/tasks/tasks";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ title?: unknown }>(event);
  setResponseStatus(event, 201);
  return createTask(useDatabase(), body?.title);
});
