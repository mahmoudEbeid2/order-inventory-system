import express from "express";
import path from "path";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { jsonParseError } from "./middlewares/jsonParseError.js";

const app = express();
app.use(express.json());
app.use(jsonParseError);

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.use("/api", router);

// Global Error Handler Middleware (must be registered after all routes)
app.use(errorHandler);

export default app;
