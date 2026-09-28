import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.getOrThrow<string>('DO_SPACES_ENDPOINT');
    const region = this.configService.getOrThrow<string>('DO_SPACES_REGION');
    const accessKeyId = this.configService.getOrThrow<string>('DO_SPACES_KEY');
    const secretAccessKey = this.configService.get<string>('DO_SPACES_SECRET') || '';
    this.bucket = this.configService.getOrThrow<string>('DO_SPACES_BUCKET');

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
    });
  }

  async uploadFile(file: Express.Multer.File, folder = 'uploads'): Promise<string> {
    const key = `${folder}/${randomUUID()}-${file.originalname}`;
    const endpoint = this.configService.getOrThrow<string>('DO_SPACES_ENDPOINT');

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      }),
    );

    const cleanEndpoint = endpoint.replace(/^https?:\/\//, '');
    return `https://${this.bucket}.${cleanEndpoint}/${key}`;
  }
}
