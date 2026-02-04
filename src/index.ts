// src/index.ts

import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors"
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import routes from "./routes.js";

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api", routes);

// Health check
app.get("/health", (req, res) => {
  console.log("okay")
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ✅ Error handling - MUST BE LAST!
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});