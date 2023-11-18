import { sql, type DatabasePoolConnection, type ValueExpression } from "slonik";
import { z } from "zod";

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  rank: z.number(),
  createdAt: z.number(),
});

function TaskQueryBuilder() {
  function rankOfTask(id: string) {
    return sql.type(
      taskSchema.pick({ rank: true })
    )`SELECT rank FROM task WHERE id = ${id}`;
  }

  function addRank(first: ValueExpression, second: ValueExpression) {
    return sql.fragment`(${first}) + (${second})`;
  }

  function averageRank(first: ValueExpression, second: ValueExpression) {
    return sql.fragment`(${addRank(first, second)}) / 2.0`;
  }

  function maxId() {
    return sql.type(
      taskSchema.pick({ id: true })
    )`SELECT id FROM task ORDER BY rank DESC FETCH FIRST ROW ONLY`;
  }

  function adjacentIdAbove(id: string) {
    return sql.type(
      taskSchema.pick({ id: true })
    )`SELECT id FROM task WHERE rank < (${rankOfTask(
      id
    )}) ORDER BY rank DESC FETCH FIRST ROW ONLY`;
  }

  function page(afterId?: string | null) {
    const whereFragment = afterId
      ? sql.fragment`WHERE rank > (${rankOfTask(afterId)})`
      : sql.fragment``;

    return sql.type(
      taskSchema
    )`SELECT * FROM task ${whereFragment} ORDER BY rank`;
  }

  function insert(payload: { title: ValueExpression; rank: ValueExpression }) {
    return sql.unsafe`INSERT INTO task (title, rank) VALUES (${payload.title}, ${payload.rank})`;
  }

  function updateTitle(id: string, title: string) {
    return sql.unsafe`UPDATE task SET title = ${title} WHERE id = ${id}`;
  }

  function updateRank(id: string, rank: ValueExpression) {
    return sql.unsafe`UPDATE task SET rank = ${rank} WHERE id = ${id}`;
  }

  return {
    rankOfTask,
    addRank,
    averageRank,
    maxId,
    adjacentIdAbove,
    page,
    insert,
    updateTitle,
    updateRank,
  };
}

export function TaskService(db: DatabasePoolConnection) {
  const query = TaskQueryBuilder();

  async function fetchPage(afterId?: string | null) {
    const data = await db.query(query.page(afterId));

    return {
      data: data.rows,
      pageInfo: {
        hasNextPage: data.rowCount !== 0,
        endCursor: data.rows[data.rowCount - 1]?.rank,
      },
    };
  }

  async function create(payload: { beforeId?: string | null; title: string }) {
    await db.query(
      query.insert({
        title: payload.title,
        rank: await nextRankExpression(payload.beforeId),
      })
    );
  }

  async function updateTitle(payload: { id: string; title: string }) {
    await db.query(query.updateTitle(payload.id, payload.title));
  }

  async function changeOrder(payload: {
    id: string;
    beforeId?: string | null;
  }) {
    await db.query(
      query.updateRank(payload.id, await nextRankExpression(payload.beforeId))
    );
  }

  /**
   * Build an SQL expression that calculates the rank value
   * between beforeId and the adjacent task.
   */
  async function nextRankExpression(beforeId?: string | null) {
    if (beforeId == null) {
      const maxTaskId = await db.maybeOneFirst(query.maxId());
      if (maxTaskId == null) {
        return 0.5;
      } else {
        return query.addRank(query.rankOfTask(maxTaskId), 1);
      }
    } else {
      const adjacentId = await db.maybeOneFirst(
        query.adjacentIdAbove(beforeId)
      );
      if (adjacentId == null) {
        return query.averageRank(0, query.rankOfTask(beforeId));
      } else {
        return query.averageRank(
          query.rankOfTask(beforeId),
          query.rankOfTask(adjacentId)
        );
      }
    }
  }

  return { fetchPage, create, updateTitle, changeOrder };
}
