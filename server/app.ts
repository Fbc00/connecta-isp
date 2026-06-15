import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { errorHandler } from "./middlewares/errorHandler.js";
import { tasksRouter } from "./modules/tasks/tasks.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(express.json());

app.use("/api/tasks", tasksRouter);

// produção: serve o build do React e faz fallback para o index.html
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "../client/dist");
  app.use(express.static(clientDist));

  // qualquer rota não-API devolve o index.html
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// tratamento de erro.
app.use(errorHandler);
