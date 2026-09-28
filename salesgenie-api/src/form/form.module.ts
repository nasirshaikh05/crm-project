import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FormController } from './form.controller';
import { FormService } from './form.service';
import { FormEntity } from './entities/form.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { LeadModule } from '../lead/lead.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FormEntity, FormSubmissionEntity]),
    LeadModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [FormController],
  providers: [FormService],
  exports: [FormService],
})
export class FormModule {}
