import express = require("express");
import morgan = require("morgan");

const app = express();
app.use(morgan("short"));

app.get("/api", (req, res) => {
  res.send("Hello, express!");
});

export = app;
