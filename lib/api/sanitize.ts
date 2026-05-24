export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 255);
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
