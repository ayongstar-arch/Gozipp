import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from './s3.service';
import { memoryStorage } from 'multer';

@Controller('upload')
export class UploadController {
    constructor(private readonly s3Service: S3Service) {}

    @Post('profile')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        fileFilter: (req, file, callback) => {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
                return callback(new BadRequestException('Only image files are allowed!'), false);
            }
            callback(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 }
    }))
    async uploadProfile(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('File is required');
        const url = await this.s3Service.uploadFile(file, 'profiles');
        return { url };
    }

    @Post('onboarding')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB for docs
    }))
    async uploadOnboardingDoc(
        @UploadedFile() file: Express.Multer.File,
        @Body('type') type: string,
        @Body('driverId') driverId: string
    ) {
        if (!file) throw new BadRequestException('File is required');
        const url = await this.s3Service.uploadFile(file, `onboarding/${driverId}`);
        return { 
            url,
            type,
            driverId,
            originalName: file.originalname
        };
    }
}
