exports.up = (
  /** @type {import("node-pg-migrate").MigrationBuilder} */
  pgm
) => {
  pgm.dropIndex("task", "rank");
  pgm.renameColumn("task", "rank", "oldRank");
  pgm.addColumn("task", {
    rank: {
      type: "decimal",
      unique: true,
    },
  });
  pgm.sql(
    `WITH cte AS (SELECT *, ROW_NUMBER() OVER() AS rn FROM task)
    UPDATE task SET rank = (SELECT rn FROM cte WHERE cte.id = task.id)`
  );
  pgm.alterColumn("task", "rank", { notNull: true });
  pgm.addIndex("task", "rank");
  pgm.dropColumn("task", "oldRank");
};
