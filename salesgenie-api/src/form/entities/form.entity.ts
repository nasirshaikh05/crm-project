import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('forms')
export class FormEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', default: [] })
  fields: Record<string, any>[];

  @Column({ type: 'jsonb', default: {} })
  design: {
    theme?: 'light' | 'dark' | 'custom';
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    borderRadius?: string;
    layout?: 'single-column' | 'two-column';
    logoUrl?: string;
  };

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 50, default: 'generic' })
  purpose: 'lead_creation' | 'lead_update' | 'generic';

  @Column({ name: 'on_success_transition', type: 'jsonb', nullable: true })
  onSuccessTransition?: {
    queueId?: string;
    stageId?: string;
    stepId?: string;
  } | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
