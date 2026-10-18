import crypto from 'node:crypto';
import { HttpError } from './middleware/errors.js';

export function slugify(text) {
  const base = String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'post'}-${suffix}`;
}

/** Accepts an array or a comma-separated string; returns a clean, de-duplicated array. */
export function toList(value, { max = 20, maxLen = 40, lower = false } = {}) {
  if (value === undefined || value === null) return [];
  const arr = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = arr
    .map((v) => String(v).trim())
    .filter(Boolean)
    .map((v) => (lower ? v.toLowerCase() : v).slice(0, maxLen));
  return [...new Set(cleaned)].slice(0, max);
}

export function str(value, field, { required = false, max = 255, min = 0 } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `${field} is required`);
    return undefined;
  }
  const s = String(value).trim();
  if (required && !s) throw new HttpError(400, `${field} is required`);
  if (s.length < min) throw new HttpError(400, `${field} must be at least ${min} characters`);
  if (s.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return s;
}

export function pageParams(q) {
  const limit = Math.min(Math.max(parseInt(q.limit, 10) || 10, 1), 50);
  const page = Math.max(parseInt(q.page, 10) || 1, 1);
  return { limit, page, offset: (page - 1) * limit };
}
