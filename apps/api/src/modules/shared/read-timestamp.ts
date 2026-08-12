/**
 * File: apps/api/src/modules/shared/read-timestamp.ts
 * Purpose: Read an ISO-8601 timestamp out of an untyped request body, refusing
 *   rather than dropping anything unparseable.
 * Category: modules
 * Scope: Phase W07 (M1 slice 4)
 *
 * Description:
 *   Extracted at the SECOND consumer, not the first: W07 adds date fields to two
 *   controllers at once (`scheduledFor` on control tests, `collectedAt` on
 *   evidence), which is the point the shape is known rather than guessed
 *   (CLAUDE.md AP-5 — abstract when the second implementation arrives).
 *
 *   ⚠️ The refusal is the whole reason this is a function rather than
 *   `new Date(value)` inline. `new Date("soon")` is an Invalid Date, and storing
 *   that yields NULL — the caller would see a record with no timestamp and no
 *   indication the one it sent was thrown away. `AD-SilentFieldDrop-1` is the same
 *   failure one field over, and it is open precisely because each new field kept
 *   deciding this for itself.
 *
 * Key Components:
 *   - readTimestamp(): undefined for absent, Date for valid, 400 for anything else
 *
 * Created: 2026-08-12 (Phase W07)
 * Last Modified: 2026-08-12
 *
 * Modification History (newest-first):
 *   - 2026-08-12: Initial creation (Phase W07) — extracted at the second consumer
 */
import { BadRequestException } from '@nestjs/common';

/**
 * `undefined` when the field is absent or null; a Date when it parses; otherwise
 * a 400 naming the field.
 */
export function readTimestamp(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException(`${field} must be an ISO-8601 string when present`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${field} must be an ISO-8601 string when present`);
  }
  return parsed;
}
