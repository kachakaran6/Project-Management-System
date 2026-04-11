declare global {
  namespace Express {
    interface Request {
      body: any;
      query: Record<string, any>;
      cookies: Record<string, any>;
      user: {
        id: string;
        role?: string | null;
        email?: string;
        [key: string]: unknown;
      };
      role?: string | null;
      organizationId?: string | null;
      rawBody?: Buffer;
    }
  }

  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      MONGO_URI?: string;
      NODE_ENV?: string;
      ALLOWED_ORIGINS?: string;
      RATE_LIMIT_ENABLED?: string;
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX?: string;
      JWT_ACCESS_SECRET?: string;
      JWT_REFRESH_SECRET?: string;
      JWT_ACCESS_EXPIRY?: string;
      JWT_JWT_ACCESS_EXPIRY?: string;
      JWT_REFRESH_EXPIRY?: string;
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_USER?: string;
      SMTP_PASS?: string;
      SMTP_FROM?: string;
      EMAIL_FROM?: string;
      APP_URL?: string;
      CLIENT_URL?: string;
      STRIPE_SECRET_KEY?: string;
      STRIPE_WEBHOOK_SECRET?: string;
      STRIPE_PRICE_ID?: string;
    }
  }
}

export {};
