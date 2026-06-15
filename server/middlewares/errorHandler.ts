import type { NextFunction, Request, Response } from "express";

export interface HttpError extends Error {
  status?: number;
}

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err.status ?? 500;
  console.error(`[error] ${status} ${err.message}`);
  res.status(status).json({ error: err.message || "Erro interno do servidor" });
}
