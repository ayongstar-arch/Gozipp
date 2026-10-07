import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { safeStorageName } from './file-validation';

@Injectable()
export class S3Service {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private isProduction: boolean;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET');
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const region = this.configService.get<string>('AWS_REGION') || 'ap-southeast-1';

    if (accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log('S3 Client initialized in production mode');
    } else {
      this.logger.warn('AWS Credentials missing. Falling back to local storage.');
    }
  }

  /**
   * Stores a PRE-VALIDATED file (see file-validation.sniffFile).
   * `contentType`/`ext` must come from magic bytes, never from the client.
   * Storage names are server-generated UUIDs — the client filename never
   * touches disk (blocks path traversal via `originalname`).
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'uploads', contentType = 'application/octet-stream', ext = 'bin'): Promise<string> {
    const fileName = safeStorageName(ext);
    // Defense in depth: folder is code-controlled, but strip separators anyway.
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `${safeFolder}/${fileName}`;

    if (this.s3Client && this.bucketName) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: contentType,
          // ACL: 'public-read', // Depends on bucket policy
        });

        await this.s3Client.send(command);
        return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
      } catch (error) {
        this.logger.error(`S3 Upload failed: ${error.message}`);
        throw new InternalServerErrorException('Could not upload file to S3');
      }
    } else {
      // Local Fallback
      const uploadDir = join(process.cwd(), 'uploads', safeFolder);
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = join(uploadDir, fileName);
      writeFileSync(filePath, file.buffer);

      this.logger.log(`File saved locally: /uploads/${safeFolder}/${fileName}`);
      return `/uploads/${safeFolder}/${fileName}`;
    }
  }

  /** Absolute local path for the authenticated file-serving endpoint. Returns null for non-local (S3) keys. */
  resolveLocalPath(storedKey: string): string | null {
    const m = /^\/uploads\/([a-zA-Z0-9_-]+)\/([0-9a-f-]{36}\.(jpg|png|gif|webp|pdf))$/.exec(storedKey);
    if (!m) return null;
    return join(process.cwd(), 'uploads', m[1], m[2]);
  }
}
