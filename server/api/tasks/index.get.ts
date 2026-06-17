import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listTasks } from "../../services/tasks/tasks";

export default defineEventHandler(() => listTasks(useDatabase()));
