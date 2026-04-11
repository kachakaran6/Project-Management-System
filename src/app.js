import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl)
      if (!origin || env.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
if (env.rateLimitEnabled) {
  app.use("/api", limiter);
}

// ─── SaaS Webhooks (Raw Body Required) ───────────────────────────
import billingRoutes from "./modules/billing/billing.routes.js";
app.use("/api/v1/billing", billingRoutes);

// ─── Request Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─── HTTP Logging ──────────────────────────────────────────────────────────────
const morganFormat = env.isProduction ? "combined" : "dev";
app.use(morgan(morganFormat));

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────
import authRoutes from "./modules/auth/auth.routes.js";
import workspaceRoutes from "./modules/workspace/workspace.routes.js";
import projectRoutes from "./modules/project/project.routes.js";
import taskRoutes from "./modules/task/task.routes.js";
import commentRoutes from "./modules/comment/comment.routes.js";
import attachmentRoutes from "./modules/attachment/attachment.routes.js";
import tagRoutes from "./modules/tag/tag.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import inviteRoutes from "./modules/invite/invite.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/attachments", attachmentRoutes);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/invites", inviteRoutes);
app.use("/api/v1/admin", adminRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: [${req.method}] ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
