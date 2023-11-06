import express from "express";
import cors from "cors";
import morgan from "morgan";
import { sql, createPool } from "slonik";
import type { Response, Request, RequestHandler } from "express";
import { z } from "zod";

const pool = await createPool(process.env.DATABASE_URL ?? "");

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

app.get(
  "/api",
  asyncHandler(async (req, res) => {
    await pool.connect(async (db) => {
      const data = await db.query(sql.unsafe`SELECT * FROM task`);
      res.send(`There are ${data.rowCount} tasks.`);
    });
  })
);

app.get(
  "/api/tasks",
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      after: z.string().nullish(),
    });
    const query = querySchema.parse(req.query);

    await pool.connect(async (db) => {
      const taskSchema = z.object({
        id: z.string().uuid(),
        title: z.string(),
        rank: z.string(),
        createdAt: z.date(),
      });

      const whereFragment = query.after
        ? sql.fragment`WHERE rank > ${query.after}`
        : sql.fragment``;

      const data = await db.query(
        sql.type(taskSchema)`SELECT * FROM task ${whereFragment} ORDER BY rank`
      );

      res.json({
        data: data.rows,
        pageInfo: {
          hasNextPage: data.rowCount !== 0,
          endCursor: data.rows[data.rowCount - 1]?.rank,
        },
      });
    });
  })
);
