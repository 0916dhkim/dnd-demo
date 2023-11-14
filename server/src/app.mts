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
app.use(express.json());

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

app.post(
  "/api/tasks",
  asyncHandler(async (req, res) => {
    const bodySchema = z.object({
      afterId: z.string().nullish(),
      title: z.string(),
    });
    const body = bodySchema.parse(req.body);

    await pool.connect(async (db) => {
      const rankOfTask = (id: string) =>
        sql.unsafe`SELECT rank FROM task WHERE id = ${id}`;

      if (body.afterId == null) {
        const minRank = await db.maybeOneFirst(
          sql.unsafe`SELECT MIN(rank) FROM task`
        );
        if (minRank == null) {
          await db.query(
            sql.unsafe`INSERT INTO task (title, rank) VALUES (${body.title}, 0.5)`
          );
        } else {
          await db.query(
            sql.unsafe`INSERT INTO task (title, rank) VALUES (${body.title}, (${minRank}) / 2.0)`
          );
        }
      } else {
        const adjacentId = await db.maybeOneFirst(
          sql.unsafe`SELECT id FROM task WHERE rank > (${rankOfTask(
            body.afterId
          )}) ORDER BY rank ASC FETCH FIRST ROW ONLY`
        );
        if (adjacentId == null) {
          await db.query(
            sql.unsafe`INSERT INTO task (title, rank) VALUES (${
              body.title
            }, (${rankOfTask(body.afterId)}) + 1)`
          );
        } else {
          await db.query(
            sql.unsafe`INSERT INTO task (title, rank) VALUES (${
              body.title
            }, ((${rankOfTask(body.afterId)}) + (${rankOfTask(
              adjacentId
            )})) / 2)`
          );
        }
      }
    });

    res.send("OK");
  })
);
