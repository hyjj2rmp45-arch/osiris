/**
 * PII minimization utilities for OSIRIS.
 *
 * Redacts personally identifiable information from API responses and logs
 * to comply with GDPR data minimization principles.
 */

/**
 * Redact PII fields from an object.
 *
 * Redacted fields:
 * - email, phone, address, ssn, dob, birthdate, passport, license
 * - firstName, lastName, fullName, name (configurable)
 * - telegramId (can be considered PII)
 *
 * @param data - The data object to redact
 * @param options - Redaction options
 * @returns Redacted copy of the data
 */
export function redactPII<T extends Record<string, unknown>>(
  data: T,
  options: { keepFields?: string[] } = {}
): T {
  const keepFields = new Set(options.keepFields || []);

  const piiFields = new Set([
    'email',
    'phone',
    'phoneNumber',
    'address',
    'street',
    'city',
    'state',
    'zip',
    'zipCode',
    'country',
    'ssn',
    'socialSecurityNumber',
    'dob',
    'birthdate',
    'dateOfBirth',
    'passport',
    'passportNumber',
    'driversLicense',
    'licenseNumber',
    'firstName',
    'lastName',
    'fullName',
    'telegramId',
    'telegram_username',
    'ipAddress',
    'ip_address',
    'userAgent',
    'user_agent',
  ]);

  const redactValue = (key: string): boolean => {
    if (keepFields.has(key)) return false;
    return piiFields.has(key);
  };

  const redactObject = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(redactObject);
    }

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (redactValue(key)) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = redactObject(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  };

  return redactObject(data) as T;
}

/**
 * Redact PII from API response data before sending to client.
 * Use this for any endpoint that returns user data.
 */
export function sanitizeUserResponse<T extends Record<string, unknown>>(data: T): T {
  return redactPII(data, {
    // Keep fields needed for UI
    keepFields: ['id', 'tier', 'role', 'username', 'authenticated', 'error'],
  });
}
