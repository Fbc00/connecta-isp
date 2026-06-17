import { defineEventHandler } from "h3";

// healthcheck dedicado (usado pelo docker-compose)
export default defineEventHandler(() => ({ status: "ok" }));
