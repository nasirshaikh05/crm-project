import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum StepActionType {
  SEND_EMAIL_WITH_BUTTONS = 'send_email_with_buttons',
  SEND_EMAIL_WITH_ATTACHMENTS = 'send_email_with_attachments',
  SEND_EMAIL_WITH_VIDEO = 'send_email_with_video',
  SEND_CALENDAR_INVITE = 'send_calendar_invite',
  SEND_EMAIL_WITH_FORM = 'send_email_with_form',
  SEND_AGREEMENT_FOR_SIGNATURE = 'send_agreement_for_signature',
  SEND_SMS = 'send_sms',
  GO_TO_NEXT_STEP = 'go_to_next_step',
  GO_TO_NEXT_STAGE = 'go_to_next_stage',
  GO_TO_NEXT_QUEUE = 'go_to_next_queue',
  CONVERT_TO_CUSTOMER = 'convert_to_customer',
  DO_NOTHING = 'do_nothing',
}

@Entity('steps')
@Unique(['stageId', 'orderIndex'])
export class Step {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stage_id', type: 'uuid', nullable: true })
  stageId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex: number;

  @Column({
    name: 'action_type',
    type: 'enum',
    enum: StepActionType,
    enumName: 'step_action_type',
  })
  actionType: StepActionType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
