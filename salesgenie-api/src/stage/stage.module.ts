import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stage } from './entities/stage.entity';
import { Queue } from '../queue/entities/queue.entity';
import { Lead } from '../lead/entities/lead.entity';
import { Step } from '../step/entities/step.entity';
import { StageService } from './stage.service';
import { StageController } from './stage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Stage, Queue, Lead, Step])],
  controllers: [StageController],
  providers: [StageService],
  exports: [StageService, TypeOrmModule],
})
export class StageModule {}
