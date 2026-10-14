import { type VacationRequestStatus, VACATION_REQUEST_STATUSES } from '@leaveflow/contracts';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'vacation_requests' })
export class VacationRequestEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  /** Calendar date as `YYYY-MM-DD` (the pg DATE parser is configured to return strings). */
  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ type: 'enum', enum: VACATION_REQUEST_STATUSES, enumName: 'vacation_request_status' })
  status: VacationRequestStatus;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  comments: string | null;

  @Column({ type: 'uuid', name: 'decided_by', nullable: true })
  decidedById: string | null;

  @ManyToOne(() => UserEntity, { createForeignKeyConstraints: false })
  @JoinColumn({ name: 'decided_by' })
  decidedBy?: UserEntity | null;

  @Column({ type: 'timestamptz', name: 'decided_at', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'uuid', name: 'idempotency_key', nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
