import cors from "cors";
import express, {
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import morgan from "morgan";
import {
  createPool,
  sql,
  SchemaValidationError,
  type Interceptor,
  type QueryResultRow,
} from "slonik";
import { z } from "zod";

const createResultParserInterceptor = (): Interceptor => {
  return {
    // If you are not going to transform results using Zod, then you should use `afterQueryExecution` instead.
    // Future versions of Zod will provide a more efficient parser when parsing without transformations.
    // You can even combine the two – use `afterQueryExecution` to validate results, and (conditionally)
    // transform results as needed in `transformRow`.
    transformRow: (executionContext, actualQuery, row): QueryResultRow => {
      const { log, resultParser } = executionContext;

      if (!resultParser) {
        return row;
      }

      const validationResult = resultParser.safeParse(row);

      if (!validationResult.success) {
        throw new SchemaValidationError(
          actualQuery,
          row,
          validationResult.error.issues
        );
      }

      return validationResult.data;
    },
  };
};

const pool = await createPool(process.env.DATABASE_URL ?? "", {
  interceptors: [createResultParserInterceptor()],
});

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
        rank: z.number(),
        createdAt: z.number(),
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
