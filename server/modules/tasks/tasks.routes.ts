import { Router } from "express";
import * as controller from "./tasks.controller.js";

export const tasksRouter = Router();

tasksRouter.get("/", controller.list);
tasksRouter.post("/", controller.create);
tasksRouter.put("/:id", controller.update);
tasksRouter.delete("/:id", controller.remove);
