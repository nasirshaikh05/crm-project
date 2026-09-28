import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('stages')
@Unique(['queueId', 'orderIndex'])
export class Stage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'queue_id', type: 'uuid' })
  queueId: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'order_index', type: 'integer' })
  orderIndex: number;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
  workspaceId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
