import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'converted_from_lead_id', type: 'uuid', nullable: true })
  convertedFromLeadId?: string;

  @Column({ name: 'first_name', type: 'varchar', length: 255 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 255 })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  suburb?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  state?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  postcode?: string | null;

  @Column({ name: 'current_queue_id', type: 'uuid', nullable: true })
  currentQueueId?: string | null;

  @Column({ name: 'current_stage_id', type: 'uuid', nullable: true })
  currentStageId?: string | null;

  @Column({ name: 'current_step_id', type: 'uuid', nullable: true })
  currentStepId?: string | null;

  @Column({ name: 'account_manager_id', type: 'uuid', nullable: true })
  accountManagerId?: string;

  @Column({ name: 'contract_start_date', type: 'date', nullable: true })
  contractStartDate?: string;

  @Column({ type: 'varchar', length: 50, default: 'active' })
  status: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string | null;

  @CreateDateColumn({ name: 'converted_at', type: 'timestamptz' })
  convertedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
