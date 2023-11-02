import { Hono } from "hono";

const app = new Hono();

app.get("/api", (c) => {
  return c.text("Hello, Hono!");
});

// Required for React SPA
app.get("*", async (c) => {
  return await (c.env?.ASSETS as any).fetch(c.req.raw);
});

export default app;
