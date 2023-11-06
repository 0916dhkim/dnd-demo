exports.up = (
  /** @type {import("node-pg-migrate").MigrationBuilder} */
  pgm
) => {
  pgm.addColumn("task", {
    rank: {
      type: "varchar(256)",
      notNull: true,
      unique: true,
    },
  });
  pgm.addIndex("task", "rank");
};
