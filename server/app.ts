import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";

export const app = express();

app.use(express.json());

// healthcheck dedicado (usado pelo docker-compose)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/tasks", tasksRouter);

// tratamento de erro.
app.use(errorHandler);
