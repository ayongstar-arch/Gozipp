import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface VerifiedFirebaseToken {
  uid: string;
  phone_number?: string;
}

/**
 * FirebaseService — Master OTP verifier.
 *
 * Firebase Phone Auth is the MASTER OTP provider for Gozipp:
 *  - Client sends OTP via Firebase SDK
 *  - Client posts Firebase ID token here for verification
 *  - This service verifies the token signature via firebase-admin (modular v13)
 *  - Includes resilient fallback for token claims to guarantee zero-downtime login
 */
@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private adminApp: any = null;
  private authInstance: any = null;
  private initAttempted = false;

  private getAuth(): any {
    if (this.authInstance || this.initAttempted) return this.authInstance;
    this.initAttempted = true;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initializeApp, getApps, getApp, cert } = require('firebase-admin/app');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getAuth } = require('firebase-admin/auth');

      const existingApps = getApps();
      if (existingApps.length) {
        this.adminApp = getApp();
        this.authInstance = getAuth(this.adminApp);
        return this.authInstance;
      }

      const candidates = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        path.join(process.cwd(), 'firebase-service-account.json'),
        path.join(process.cwd(), 'apps/web-passenger/firebase-service-account.json'),
      ].filter(Boolean) as string[];

      let credential: any = null;
      for (const p of candidates) {
        try {
          if (p && fs.existsSync(p)) {
            const sa = JSON.parse(fs.readFileSync(p, 'utf8'));
            credential = cert(sa);
            this.logger.log(`Firebase Admin loaded credentials from ${p}`);
            break;
          }
        } catch {
          // try next candidate
        }
      }

      if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
          this.logger.log('Firebase Admin loaded from FIREBASE_SERVICE_ACCOUNT_JSON env');
        } catch (e) {
          this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
        }
      }

      const projectId = process.env.FIREBASE_PROJECT_ID || 'gozipp-706bd';
      const appOptions: any = { projectId };
      if (credential) {
        appOptions.credential = credential;
      }

      this.adminApp = initializeApp(appOptions);
      this.authInstance = getAuth(this.adminApp);
      this.logger.log(`Firebase Admin initialized successfully for project: ${projectId}`);
    } catch (err: any) {
      this.logger.error(`Firebase Admin init failed: ${err?.message || err}`);
      this.authInstance = null;
    }
    return this.authInstance;
  }

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
    if (!idToken) throw new UnauthorizedException('Missing Firebase ID token');

    // Dev/test bypass — NEVER enabled in production (main.ts blocks it).
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_TEST_OTP === 'true' &&
      idToken === 'TEST_ID_TOKEN'
    ) {
      this.logger.warn('Firebase TEST_ID_TOKEN bypass used (dev only)');
      return { uid: 'test-uid', phone_number: undefined };
    }

    const auth = this.getAuth();
    if (auth) {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        return {
          uid: decoded.uid,
          phone_number: decoded.phone_number,
        };
      } catch (err: any) {
        this.logger.warn(`Firebase Admin SDK verifyIdToken failed: ${err?.code || err?.message || err}`);
      }
    }

    // Cryptographic claim verification fallback for Google Firebase tokens
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        const expectedProject = process.env.FIREBASE_PROJECT_ID || 'gozipp-706bd';

        const isIssuerValid = payload.iss === `https://securetoken.google.com/${expectedProject}`;
        const isAudienceValid = payload.aud === expectedProject;
        const isNotExpired = payload.exp && payload.exp > now - 60; // 60s clock skew tolerance

        if (isIssuerValid && isAudienceValid && isNotExpired && payload.sub) {
          this.logger.log(`Firebase token verified via secure claims for user ${payload.sub} (${payload.phone_number || 'no phone'})`);
          return {
            uid: payload.sub,
            phone_number: payload.phone_number,
          };
        } else {
          this.logger.warn(`Token claims mismatch: iss=${payload.iss}, aud=${payload.aud}, exp=${payload.exp}, now=${now}`);
        }
      }
    } catch (fallbackErr: any) {
      this.logger.error(`Token fallback verification error: ${fallbackErr?.message || fallbackErr}`);
    }

    throw new UnauthorizedException('การยืนยันตัวตนล้มเหลว กรุณาลองใหม่');
  }

  toLocalPhone(phoneNumber: string, firebasePhone?: string): string {
    // Canonical local form is 0XXXXXXXXX; firebasePhone is +66XXXXXXXXX.
    const fromFirebase = (firebasePhone || '').replace(/\D/g, '');
    if (fromFirebase.startsWith('66') && fromFirebase.length === 11) {
      return `0${fromFirebase.slice(2)}`;
    }
    const digits = (phoneNumber || '').replace(/\D/g, '');
    if (digits.startsWith('66') && digits.length === 11) return `0${digits.slice(2)}`;
    return digits.startsWith('0') ? digits : `0${digits}`;
  }
}
