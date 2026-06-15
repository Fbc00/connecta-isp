import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";

export const app = express();

app.use(express.json());

app.use("/api/tasks", tasksRouter);

// o client (build do React) é servido pelo nginx — aqui só respondemos a API

// tratamento de erro.
app.use(errorHandler);
