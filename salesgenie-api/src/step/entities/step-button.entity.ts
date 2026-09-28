import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('step_buttons')
export class StepButton {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'step_id', type: 'uuid' })
  stepId: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({ name: 'order_index', type: 'integer', default: 0 })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
