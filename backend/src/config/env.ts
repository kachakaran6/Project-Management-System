import "dotenv/config";

type Env = {
  port: number;
  mongoUri: string;
  nodeEnv: string;
  isProduction: boolean;
  isDevelopment: boolean;
  allowedOrigins: string[];
  rateLimitEnabled: boolean;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpFamily?: number;
  smtpDebug: boolean;
  smtpConnectionTimeoutMs: number;
  smtpGreetingTimeoutMs: number;
  smtpSocketTimeoutMs: number;
  smtpUser?: string;
  smtpPass?: string;
  emailFrom?: string;
  resendApiKey?: string;
  inviteEmailRequired: boolean;
  frontendUrl?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  notifyAdminsOnly: boolean;
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
};

const requiredEnvVars = ["PORT", "MONGO_URI", "NODE_ENV"];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

export const env: Env = {
  port: parseInt(process.env.PORT!, 10) || 5000,
  mongoUri: process.env.MONGO_URI!,
  nodeEnv: process.env.NODE_ENV!,
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",

  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:3000"],

  // Rate limiting
  rateLimitEnabled:
    process.env.RATE_LIMIT_ENABLED !== undefined
      ? process.env.RATE_LIMIT_ENABLED === "true"
      : process.env.NODE_ENV === "production",
  rateLimitWindowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS!, 10) || 15 * 60 * 1000, // 15 min
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX!, 10) || 100,

  // JWT
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "fallback-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRY || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRY || "7d",

  // SMTP
  smtpHost: process.env.SMTP_HOST || 'smtp.ethereal.email',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpFamily: parseInt(process.env.SMTP_FAMILY || '4', 10),
  smtpDebug: process.env.SMTP_DEBUG === 'true',
  smtpConnectionTimeoutMs: parseInt(process.env.SMTP_CONNECTION_TIMEOUT_MS || '10000', 10),
  smtpGreetingTimeoutMs: parseInt(process.env.SMTP_GREETING_TIMEOUT_MS || '10000', 10),
  smtpSocketTimeoutMs: parseInt(process.env.SMTP_SOCKET_TIMEOUT_MS || '10000', 10),
  smtpUser: process.env.SMTP_USER || process.env.EMAIL_USER,
  smtpPass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@pms-orbit.io',
  resendApiKey: process.env.RESEND_API_KEY,
  inviteEmailRequired: process.env.INVITE_EMAIL_REQUIRED === 'true',
  notifyAdminsOnly: process.env.NOTIFY_ADMINS_ONLY !== 'false',

  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
};
