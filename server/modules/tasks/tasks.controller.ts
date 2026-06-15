import type { NextFunction, Request, Response } from "express";
import * as service from "./tasks.service.js";

export function list(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json(service.listTasks());
  } catch (err) {
    next(err);
  }
}

export function create(req: Request, res: Response, next: NextFunction) {
  try {
    const task = service.createTask(req.body?.title);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
}

export function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const task = service.updateTask(id, {
      title: req.body?.title,
      completed: req.body?.completed,
    });
    res.json(task);
  } catch (err) {
    next(err);
  }
}

export function remove(req: Request, res: Response, next: NextFunction) {
  try {
    service.deleteTask(Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
