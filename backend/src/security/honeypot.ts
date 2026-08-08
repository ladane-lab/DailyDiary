import { Request } from 'express';
import logger from '../lib/logger.js';

// The field names we use for honeypot (bots often fill fields like 'website', 'email_confirm')
export const HONEYPOT_FIELDS = ['website_honey', 'email_honey', 'phone_honey'];

/**
 * Checks if a request has filled any honeypot field.
 * @returns true if a bot is detected (honeypot field is filled), false otherwise.
 */
export function isHoneypotTriggered(req: Request): boolean {
  // Honeypots are only sent via POST/PUT/PATCH/DELETE bodies
  if (!req.body || typeof req.body !== 'object') {
    return false;
  }

  for (const field of HONEYPOT_FIELDS) {
    const val = req.body[field];
    
    // If the field exists and is a non-empty string, a bot filled it
    if (val !== undefined && val !== null && val !== '') {
      logger.warn(`[Honeypot Triggered] Bot detected! Field: ${field} was filled with value: "${val}" | IP: ${req.ip}`);
      return true;
    }
  }

  return false;
}
