import cors from "cors";
import express, {
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import morgan from "morgan";
import { z } from "zod";
import { TaskService } from "./task.mjs";
import { pool } from "./database.mjs";

const asyncHandler =
  (wrapped: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  async (req, res, next) => {
    try {
      await wrapped(req, res);
    } catch (e) {
      next(e);
    }
  };

export const app = express();
app.use(morgan("short"));
app.use(cors());
app.use(express.json());

app.get(
  "/api/tasks",
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      afterId: z.string().nullish(),
    });
    const query = querySchema.parse(req.query);

    await pool.connect(async (db) => {
      const taskService = TaskService(db);
      res.json(await taskService.fetchPage(query.afterId));
    });
  })
);

app.post(
  "/api/tasks",
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      beforeId: z.string().nullish(),
      title: z.string(),
    });
    const body = bodySchema.parse(req.body);

    await pool.connect(async (db) => {
      const taskService = TaskService(db);
      await taskService.create(body);
    });

    res.send("OK");
  })
);

app.post(
  "/api/tasks/update-title",
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      id: z.string(),
      title: z.string(),
    });
    const body = bodySchema.parse(req.body);

    await pool.connect(async (db) => {
      const taskService = TaskService(db);
      await taskService.updateTitle(body);
    });

    res.send("OK");
  })
);
