import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { StepActionType } from '../../step/entities/step.entity';

@Entity('step_action_executions')
export class StepActionExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId?: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ name: 'step_id', type: 'uuid' })
  stepId: string;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: StepActionType,
    enumName: 'step_action_type',
  })
  actionType: StepActionType;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string; // 'pending' | 'sent' | 'failed' | 'clicked'

  @Column({ name: 'clicked_button_id', type: 'uuid', nullable: true })
  clickedButtonId?: string;

  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executedAt?: Date;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
