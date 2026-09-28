import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('step_action_content')
export class StepActionContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'step_id', type: 'uuid', unique: true })
  stepId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subject?: string;

  @Column({ type: 'text', nullable: true })
  body?: string;

  @Column({ name: 'attachment_url', type: 'text', nullable: true })
  attachmentUrl?: string;

  @Column({ name: 'video_url', type: 'text', nullable: true })
  videoUrl?: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
