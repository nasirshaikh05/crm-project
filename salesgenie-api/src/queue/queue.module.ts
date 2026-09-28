import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Queue } from './entities/queue.entity';
import { Lead } from '../lead/entities/lead.entity';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Queue, Lead])],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService, TypeOrmModule],
})
export class QueueModule {}
