import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LeadController } from './lead.controller';
import { LeadService } from './lead.service';
import { LeadCreatedListener } from './listeners/lead-created.listener';
import { NotificationModule } from '../notification/notification.module';
import { StorageModule } from '../storage/storage.module';
import { WorkflowStore } from './workflow-store.service';
import { Lead } from './entities/lead.entity';
import { Customer } from './entities/customer.entity';
import { Queue } from '../queue/entities/queue.entity';
import { Stage } from '../stage/entities/stage.entity';
import { Step } from '../step/entities/step.entity';
import { StepActionContent } from '../step/entities/step-action-content.entity';
import { StepButton } from '../step/entities/step-button.entity';
import { StepButtonTransition } from '../step/entities/step-button-transition.entity';
import { ContactTransitionLog } from './entities/contact-transition-log.entity';
import { StepActionExecution } from './entities/step-action-execution.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Lead,
      Customer,
      Queue,
      Stage,
      Step,
      StepActionContent,
      StepButton,
      StepButtonTransition,
      ContactTransitionLog,
      StepActionExecution,
    ]),
    NotificationModule,
    StorageModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [LeadController],
  providers: [LeadService, LeadCreatedListener, WorkflowStore],
  exports: [WorkflowStore, TypeOrmModule, LeadService],
})
export class LeadModule {}
