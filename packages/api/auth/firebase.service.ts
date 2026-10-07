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
 *  - Client sends OTP via Firebase SDK (no backend SMS cost)
 *  - Client posts Firebase ID token here for verification
 *  - This service verifies the token signature via firebase-admin
 *
 * ThaiBulkSMS (SmsService) is kept only as a deprecated fallback.
 */
@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private admin: any = null;
  private initAttempted = false;

  private getAdmin(): any {
    if (this.admin || this.initAttempted) return this.admin;
    this.initAttempted = true;

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admin = require('firebase-admin');
      if (admin.apps?.length) {
        this.admin = admin;
        return this.admin;
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
            credential = admin.credential.cert(sa);
            this.logger.log(`Firebase Admin loaded from ${p}`);
            break;
          }
        } catch {
          // try next candidate
        }
      }

      if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
        this.logger.log('Firebase Admin loaded from FIREBASE_SERVICE_ACCOUNT_JSON env');
      }

      if (credential) {
        admin.initializeApp({ credential });
      } else {
        this.logger.warn('Firebase Admin: no service account found, initializing without credential (verify will fail)');
        admin.initializeApp();
      }
      this.admin = admin;
    } catch (err: any) {
      this.logger.error(`Firebase Admin init failed: ${err?.message || err}`);
      this.admin = null;
    }
    return this.admin;
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

    const admin = this.getAdmin();
    if (!admin) throw new UnauthorizedException('Firebase Admin not initialized');
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (err: any) {
      this.logger.warn(`Firebase token verification failed: ${err?.message || err}`);
      throw new UnauthorizedException('การยืนยันตัวตนล้มเหลว กรุณาลองใหม่');
    }
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
