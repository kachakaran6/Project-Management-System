import crypto from 'crypto';

type DeviceType = 'mobile' | 'desktop' | 'tablet' | 'unknown';

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const getRefreshTokenExpiryDate = (token: string): Date => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid refresh token format.');
  }

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { exp?: number };
  if (!payload.exp) {
    throw new Error('Refresh token has no exp claim.');
  }

  return new Date(payload.exp * 1000);
};

export const parseDeviceInfo = (userAgent: string): { deviceName: string; deviceType: DeviceType } => {
  const ua = (userAgent || '').toLowerCase();

  const isTablet = /ipad|tablet|playbook|silk/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua));
  const isMobile = /mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua);

  let deviceType: DeviceType = 'desktop';
  if (isTablet) {
    deviceType = 'tablet';
  } else if (isMobile) {
    deviceType = 'mobile';
  } else if (!ua) {
    deviceType = 'unknown';
  }

  let browser = 'Browser';
  if (/edg\//.test(ua)) browser = 'Edge';
  else if (/opr\//.test(ua) || /opera/.test(ua)) browser = 'Opera';
  else if (/chrome\//.test(ua) && !/edg\//.test(ua)) browser = 'Chrome';
  else if (/firefox\//.test(ua)) browser = 'Firefox';
  else if (/safari\//.test(ua) && !/chrome\//.test(ua)) browser = 'Safari';

  const os = /windows/.test(ua)
    ? 'Windows'
    : /mac os x|macintosh/.test(ua)
      ? 'macOS'
      : /android/.test(ua)
        ? 'Android'
        : /iphone|ipad|ios/.test(ua)
          ? 'iOS'
          : /linux/.test(ua)
            ? 'Linux'
            : '';

  const deviceName = [browser, os].filter(Boolean).join(' on ') || 'Unknown Device';
  return { deviceName, deviceType };
};
