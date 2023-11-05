import express from "express";
import morgan from "morgan";
import { sql, createPool } from "slonik";
import dotenv from "dotenv";
import type { Response, Request, RequestHandler } from "express";
dotenv.config();

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

app.get(
  "/api",
  asyncHandler(async (req, res) => {
    await pool.connect(async (db) => {
      const data = await db.query(sql.unsafe`SELECT * FROM task`);
      res.send(`There are ${data.rowCount} tasks.`);
    });
  })
);
