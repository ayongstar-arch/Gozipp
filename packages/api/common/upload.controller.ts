import { Controller, Post, Get, Param, UseInterceptors, UploadedFile, BadRequestException, Body, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { readFileSync, existsSync } from 'fs';
import { Throttle } from '@nestjs/throttler';
import { S3Service } from './s3.service';
import { AuthGuard } from './guards';
import { sniffFile, SafeFileKind } from './file-validation';

const IMAGE_KINDS: SafeFileKind[] = ['jpg', 'png', 'gif', 'webp'];
const DOC_KINDS: SafeFileKind[] = ['jpg', 'png', 'gif', 'webp', 'pdf'];

const SERVE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

@Controller('upload')
export class UploadController {
    constructor(private readonly s3Service: S3Service) {}

    private storeValidated(file: Express.Multer.File, folder: string, allowed: SafeFileKind[]) {
        if (!file?.buffer?.length) throw new BadRequestException('File is required');
        const sniffed = sniffFile(file.buffer, allowed);
        if (!sniffed) throw new BadRequestException('Only JPG, PNG, GIF, WebP images (and PDF for documents) are allowed');
        return { sniffed };
    }

    @Post('profile')
    @UseGuards(AuthGuard)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 }
    }))
    async uploadProfile(@UploadedFile() file: Express.Multer.File) {
        const { sniffed } = this.storeValidated(file, 'profiles', IMAGE_KINDS);
        const url = await this.s3Service.uploadFile(file, 'profiles', sniffed.mime, sniffed.ext);
        return { url };
    }

    @Post('onboarding')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB for docs
    }))
    async uploadOnboardingDoc(
        @UploadedFile() file: Express.Multer.File,
        @Body('type') type: string,
        @Body('driverId') driverId: string
    ) {
        // Public (pre-auth registration) but strictly validated: magic bytes only.
        const { sniffed } = this.storeValidated(file, 'onboarding', DOC_KINDS);
        const url = await this.s3Service.uploadFile(file, 'onboarding', sniffed.mime, sniffed.ext);
        return {
            url,
            type,
            driverId,
        };
    }

    /**
     * Authenticated file serving — replaces the old public /uploads static mount.
     * Key shape is strictly validated (uuid + safe ext); anything else 404s,
     * which also blocks path traversal.
     */
    @Get('file/:folder/:name')
    @UseGuards(AuthGuard)
    async serveFile(@Param('folder') folder: string, @Param('name') name: string, @Res({ passthrough: true }) res: Response) {
        const storedKey = `/uploads/${folder}/${name}`;
        const localPath = this.s3Service.resolveLocalPath(storedKey);
        if (!localPath || !existsSync(localPath)) throw new NotFoundException('File not found');
        const ext = storedKey.split('.').pop() || '';
        res.setHeader('Content-Type', SERVE_MIME[ext] || 'application/octet-stream');
        // Never let the browser execute served files.
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
        return Buffer.from(readFileSync(localPath));
    }
}
