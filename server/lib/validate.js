export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Rejects any top-level string field longer than `max` chars. JSONB objects
// are stringified for the length check so a giant nested blob is also caught.
export const assertLengths = (body, max = 20000) => {
  for (const [key, value] of Object.entries(body || {})) {
    const asString = typeof value === 'string' ? value : (value && typeof value === 'object' ? JSON.stringify(value) : '');
    if (asString.length > max) {
      throw new HttpError(400, `Field '${key}' exceeds maximum length of ${max} characters`);
    }
  }
};
