import { defineEventHandler, getRouterParam, setResponseStatus } from "h3";
import { useDatabase } from "nitro/database";
import { deleteTask } from "../../services/tasks/tasks";

export default defineEventHandler(async (event) => {
  await deleteTask(useDatabase(), Number(getRouterParam(event, "id")));
  setResponseStatus(event, 204);
  return null;
});
