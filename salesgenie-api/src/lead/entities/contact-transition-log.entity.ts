import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('contact_transition_log')
export class ContactTransitionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lead_id', type: 'uuid', nullable: true })
  leadId?: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @Column({ name: 'from_queue_id', type: 'uuid', nullable: true })
  fromQueueId?: string | null;

  @Column({ name: 'from_stage_id', type: 'uuid', nullable: true })
  fromStageId?: string | null;

  @Column({ name: 'from_step_id', type: 'uuid', nullable: true })
  fromStepId?: string | null;

  @Column({ name: 'to_queue_id', type: 'uuid', nullable: true })
  toQueueId?: string | null;

  @Column({ name: 'to_stage_id', type: 'uuid', nullable: true })
  toStageId?: string | null;

  @Column({ name: 'to_step_id', type: 'uuid', nullable: true })
  toStepId?: string | null;

  @Column({ name: 'triggered_by', type: 'varchar', length: 100, nullable: true })
  triggeredBy?: string;

  @Column({ name: 'button_id', type: 'uuid', nullable: true })
  buttonId?: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
