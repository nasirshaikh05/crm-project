import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phoneNumber: string;

  @Column({ name: 'current_queue_id', type: 'uuid', nullable: true })
  currentQueueId?: string | null;

  @Column({ name: 'current_stage_id', type: 'uuid', nullable: true })
  currentStageId?: string | null;

  @Column({ name: 'current_step_id', type: 'uuid', nullable: true })
  currentStepId?: string | null;

  @Column({ name: 'suburb', type: 'varchar', length: 255, nullable: true })
  suburb?: string | null;

  @Column({ name: 'postcode', type: 'varchar', length: 50, nullable: true })
  postcode?: string | null;

  @Column({ name: 'state', type: 'varchar', length: 255, nullable: true })
  state?: string | null;

  @Column({ name: 'date', type: 'timestamptz', nullable: true })
  date?: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string; // active, converted, lost, etc.

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'attachments', type: 'jsonb', nullable: true })
  attachments?: any[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
