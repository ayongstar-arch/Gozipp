import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

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

  async uploadFile(file: Express.Multer.File, folder: string = 'uploads'): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    const key = `${folder}/${fileName}`;

    if (this.s3Client && this.bucketName) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
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
      const uploadDir = join(process.cwd(), 'uploads', folder);
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = join(uploadDir, fileName);
      writeFileSync(filePath, file.buffer);
      
      this.logger.log(`File saved locally: /uploads/${folder}/${fileName}`);
      return `/uploads/${folder}/${fileName}`;
    }
  }
}
