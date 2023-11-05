exports.up = (
  /** @type {import("node-pg-migrate").MigrationBuilder} */
  pgm
) => {
  pgm.createExtension("uuid-ossp", { ifNotExists: true });
  pgm.createTable("task", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    title: {
      type: "text",
      notNull: true,
    },
    createdAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });
};
