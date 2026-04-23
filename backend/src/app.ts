import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestIdMiddleware, requestLogger } from "./middlewares/observability.middleware.js";

const app = express();

// Trust proxy is required for Render/Vercel/Cloudflare to correctly set 'Secure' cookies
app.set("trust proxy", 1);


const normalizedAllowedOrigins = env.allowedOrigins.map((origin) =>
  origin.replace(/\/+$/, ""),
);

const isOriginAllowed = (origin: string): boolean => {
  const normalizedOrigin = origin.replace(/\/+$/, "");

  return normalizedAllowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === normalizedOrigin) {
      return true;
    }

    if (!allowedOrigin.includes("*")) {
      return false;
    }

    const wildcardPattern = new RegExp(
      `^${allowedOrigin
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")}$`,
      "i",
    );

    return wildcardPattern.test(normalizedOrigin);
  });
};

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(requestIdMiddleware);
app.use(requestLogger);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl)
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS REJECTED] Origin: ${origin}. Allowed Origins: ${normalizedAllowedOrigins.join(", ")}`);
        callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-organization-id", "Accept"],
    exposedHeaders: ["Set-Cookie"],
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
import notificationRoutes from "./modules/notification/notification.routes.js";
import inviteRoutes from "./modules/invite/invite.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import pageRoutes from "./modules/page/page.routes.js";
import organizationRoutes from "./modules/organization/organization.routes.js";
import telegramRoutes from "./modules/telegram/telegram.routes.js";
import activityLogRoutes from "./modules/activityLog/activityLog.routes.js";
import sessionRoutes from "./modules/session/session.routes.js";
import projectResourceRoutes from "./modules/project-resource/project-resource.routes.js";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/project-resources", projectResourceRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/attachments", attachmentRoutes);
app.use("/api/v1/tags", tagRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/invites", inviteRoutes);
app.use("/api/v1/invite", inviteRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/pages", pageRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/activity-logs", activityLogRoutes);
app.use("/api/v1/activitylogs", activityLogRoutes);
app.use("/api/v1/telegram", telegramRoutes);
app.use("/api/v1/sessions", sessionRoutes);

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
