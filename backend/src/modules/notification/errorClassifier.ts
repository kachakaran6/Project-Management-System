export enum ErrorSeverity {
  CRITICAL = 'CRITICAL', // Immediate Telegram Alert
  HIGH = 'HIGH',         // Alert after threshold
  MEDIUM = 'MEDIUM',     // Log only
  LOW = 'LOW',           // Ignore or minimal logging
}

/**
 * Intelligent Error Classifier
 * Maps errors to severity based on HTTP status, error types, and business logic.
 */
export class ErrorClassifier {
  static classify(error: any, statusCode: number): ErrorSeverity {
    // 1. Explicitly marked critical
    if (error.isCritical) return ErrorSeverity.CRITICAL;

    // 2. Database & Infrastructure Failures (Critical)
    const criticalErrorNames = [
      'MongoNetworkError',
      'MongooseServerSelectionError',
      'ConnectionError',
      'ServiceUnavailableError'
    ];
    if (criticalErrorNames.includes(error.name)) return ErrorSeverity.CRITICAL;

    // 3. Status Code Classification
    if (statusCode >= 500) return ErrorSeverity.CRITICAL;
    
    // Auth & Permission Spikes (High)
    if ([401, 403, 429].includes(statusCode)) return ErrorSeverity.HIGH;

    // 4. Business-Aware Logic (Custom Error Codes)
    const errorCode = error.code || error.errorCode || '';

    const criticalBusinessErrors = [
      'PAYMENT_FAILED',
      'DB_CONNECTION_LOST',
      'AUTH_SYSTEM_FAILURE',
      'CRITICAL_DATA_MISSING'
    ];
    if (criticalBusinessErrors.includes(errorCode)) return ErrorSeverity.CRITICAL;

    const highBusinessErrors = [
      'TASK_CREATION_FAILED',
      'FILE_UPLOAD_FAILED',
      'NOTIFICATION_FAILED',
      'OTP_NOT_SENT',
      'APPOINTMENT_CREATION_FAILED'
    ];
    if (highBusinessErrors.includes(errorCode)) return ErrorSeverity.HIGH;

    // 5. Validation and User Errors (Medium)
    if (statusCode >= 400 && statusCode < 500) return ErrorSeverity.MEDIUM;

    return ErrorSeverity.LOW;
  }

  /**
   * Helper to determine if an error should trigger a Telegram alert.
   */
  static shouldNotify(severity: ErrorSeverity, count: number, threshold: number): boolean {
    if (severity === ErrorSeverity.CRITICAL) return true;
    if (severity === ErrorSeverity.HIGH && count >= threshold) return true;
    return false;
  }
}
