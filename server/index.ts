import { app } from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  const mode = process.env.NODE_ENV === "production" ? "production" : "development";
  console.log(`[server] rodando em http://localhost:${PORT} (${mode})`);
});
