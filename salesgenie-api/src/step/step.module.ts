import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Step } from './entities/step.entity';
import { StepActionContent } from './entities/step-action-content.entity';
import { StepButton } from './entities/step-button.entity';
import { StepButtonTransition } from './entities/step-button-transition.entity';
import { Stage } from '../stage/entities/stage.entity';
import { Queue } from '../queue/entities/queue.entity';
import { Lead } from '../lead/entities/lead.entity';
import { StepService } from './step.service';
import { StepController } from './step.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Step,
      StepActionContent,
      StepButton,
      StepButtonTransition,
      Stage,
      Queue,
      Lead,
    ]),
  ],
  controllers: [StepController],
  providers: [StepService],
  exports: [StepService, TypeOrmModule],
})
export class StepModule {}
