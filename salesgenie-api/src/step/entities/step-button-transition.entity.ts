import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum TransitionTargetType {
  NEXT_STEP = 'next_step',
  NEXT_STAGE = 'next_stage',
  NEXT_QUEUE = 'next_queue',
  SPECIFIC_STEP = 'specific_step',
  SPECIFIC_STAGE = 'specific_stage',
  SPECIFIC_QUEUE = 'specific_queue',
  CONVERT_TO_CUSTOMER = 'convert_to_customer',
  DO_NOTHING = 'do_nothing',
}

@Entity('step_button_transitions')
export class StepButtonTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'button_id', type: 'uuid', unique: true })
  buttonId: string;

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: TransitionTargetType,
    enumName: 'transition_target_type',
  })
  targetType: TransitionTargetType;

  @Column({ name: 'target_step_id', type: 'uuid', nullable: true })
  targetStepId?: string;

  @Column({ name: 'target_stage_id', type: 'uuid', nullable: true })
  targetStageId?: string;

  @Column({ name: 'target_queue_id', type: 'uuid', nullable: true })
  targetQueueId?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
