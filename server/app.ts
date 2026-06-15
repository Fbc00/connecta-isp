import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";

export const app = express();

app.use(express.json());

app.use("/api/tasks", tasksRouter);

// tratamento de erro.
app.use(errorHandler);
