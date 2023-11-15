import cors from "cors";
import express, {
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import morgan from "morgan";
import {
  createPool,
  SchemaValidationError,
  type Interceptor,
  type QueryResultRow,
} from "slonik";
import { z } from "zod";
import { TaskService } from "./task.mjs";

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
