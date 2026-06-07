import express from "express";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();
app.use(express.json());

app.use("/api/v1", router);

// Global Error Handler Middleware (must be registered after all routes)
app.use(errorHandler);

export default app;
