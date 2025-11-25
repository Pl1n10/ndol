import crypto from 'crypto';
import { db } from './db/index.js';
import * as schema from './db/schema.js';
import { eq } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';

// Secret per JWT (in produzione usa una env var!)
const JWT_SECRET = process.env.JWT_SECRET || 'ndol-secret-change-in-production-' + crypto.randomBytes(16).toString('hex');
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 giorni

// ============ PASSWORD HASHING ============

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// ============ JWT (semplice, senza librerie esterne) ============

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString();
}

interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
}

export function createToken(userId: string, email: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: TokenPayload = {
    userId,
    email,
    exp: Date.now() + TOKEN_EXPIRY,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    
    // Verifica firma
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== expectedSignature) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(base64UrlDecode(payloadB64));
    
    // Verifica scadenza
    if (payload.exp < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ============ AUTH MIDDLEWARE ============

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
  };

  next();
}

// ============ USER FUNCTIONS ============

const VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 ore

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createUser(email: string, password: string, name?: string) {
  const existingUser = db.select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .get();

  if (existingUser) {
    throw new Error('Email già registrata');
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const verificationToken = generateVerificationToken();
  const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

  db.insert(schema.users).values({
    id,
    email: email.toLowerCase(),
    passwordHash,
    name,
    emailVerified: false,
    verificationToken,
    verificationExpires,
    createdAt: new Date(),
  }).run();

  return { 
    id, 
    email: email.toLowerCase(), 
    name,
    verificationToken, // Lo restituiamo per inviare l'email
  };
}

export async function authenticateUser(email: string, password: string) {
  const user = db.select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .get();

  if (!user) {
    throw new Error('Credenziali non valide');
  }

  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error('Credenziali non valide');
  }

  if (!user.emailVerified) {
    throw new Error('Email non verificata. Controlla la tua casella di posta.');
  }

  const token = createToken(user.id, user.email);
  
  return {
    user: { id: user.id, email: user.email, name: user.name },
    token,
  };
}

export async function verifyEmail(token: string) {
  const user = db.select()
    .from(schema.users)
    .where(eq(schema.users.verificationToken, token))
    .get();

  if (!user) {
    throw new Error('Token non valido');
  }

  if (user.verificationExpires && new Date(user.verificationExpires) < new Date()) {
    throw new Error('Token scaduto. Richiedi una nuova email di verifica.');
  }

  if (user.emailVerified) {
    throw new Error('Email già verificata');
  }

  db.update(schema.users)
    .set({ 
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
    })
    .where(eq(schema.users.id, user.id))
    .run();

  return { success: true, email: user.email };
}

export async function resendVerificationEmail(email: string) {
  const user = db.select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .get();

  if (!user) {
    throw new Error('Email non trovata');
  }

  if (user.emailVerified) {
    throw new Error('Email già verificata');
  }

  const verificationToken = generateVerificationToken();
  const verificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

  db.update(schema.users)
    .set({ 
      verificationToken,
      verificationExpires,
    })
    .where(eq(schema.users.id, user.id))
    .run();

  return { 
    email: user.email, 
    verificationToken,
  };
}

export function getUserById(id: string) {
  return db.select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .get();
}

// ============ RESET PASSWORD ============

const RESET_TOKEN_EXPIRY = 1 * 60 * 60 * 1000; // 1 ora

export async function requestPasswordReset(email: string) {
  const user = db.select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .get();

  if (!user) {
    // Non rivelare se l'email esiste o no per sicurezza
    return { success: true };
  }

  const resetToken = generateVerificationToken();
  const resetExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY);

  db.update(schema.users)
    .set({ 
      resetToken,
      resetExpires,
    })
    .where(eq(schema.users.id, user.id))
    .run();

  return { 
    email: user.email, 
    resetToken,
    hasUser: true,
  };
}

export async function verifyResetToken(token: string) {
  const user = db.select()
    .from(schema.users)
    .where(eq(schema.users.resetToken, token))
    .get();

  if (!user) {
    throw new Error('Token non valido');
  }

  if (user.resetExpires && new Date(user.resetExpires) < new Date()) {
    throw new Error('Token scaduto. Richiedi un nuovo reset password.');
  }

  return { valid: true, email: user.email };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = db.select()
    .from(schema.users)
    .where(eq(schema.users.resetToken, token))
    .get();

  if (!user) {
    throw new Error('Token non valido');
  }

  if (user.resetExpires && new Date(user.resetExpires) < new Date()) {
    throw new Error('Token scaduto. Richiedi un nuovo reset password.');
  }

  const passwordHash = hashPassword(newPassword);

  db.update(schema.users)
    .set({ 
      passwordHash,
      resetToken: null,
      resetExpires: null,
    })
    .where(eq(schema.users.id, user.id))
    .run();

  return { success: true };
}
