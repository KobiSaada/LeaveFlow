import { ACTIVE_VACATION_REQUEST_STATUSES } from '@leaveflow/contracts';
import type { EntityManager } from 'typeorm';
import type { Transaction } from '../../../shared/application/unit-of-work';
import { asConstraintViolation, PG_ERROR } from '../../../shared/infrastructure/database/pg-errors';
import { entityManagerOf } from '../../../shared/infrastructure/database/typeorm-unit-of-work';
import type { VacationRequestRepository } from '../application/ports/vacation-request-repository';
import { DateRange } from '../domain/date-range';
import { VacationRequest } from '../domain/vacation-request';
import { IdempotencyKeyReusedError, VacationOverlapError } from '../domain/vacation-request.errors';
import { VacationRequestEntity } from './vacation-request.entity';

function toDomain(row: VacationRequestEntity): VacationRequest {
  return VacationRequest.rehydrate({
    id: row.id,
    userId: row.userId,
    range: DateRange.fromTrusted(row.startDate, row.endDate),
    reason: row.reason,
    status: row.status,
    comments: row.comments,
    decidedBy: row.decidedById,
    decidedAt: row.decidedAt,
    idempotencyKey: row.idempotencyKey,
  });
}

export class TypeOrmVacationRequestRepository implements VacationRequestRepository {
  private repo(tx: Transaction) {
    return entityManagerOf(tx).getRepository(VacationRequestEntity);
  }

  async lockScheduleOf(tx: Transaction, userId: string): Promise<void> {
    // Transaction-scoped advisory lock (released on COMMIT/ROLLBACK). Unlike SELECT … FOR UPDATE on
    // users, it does not block unrelated foreign-key checks against the user row.
    await entityManagerOf(tx).query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
      `vacation-schedule:${userId}`,
    ]);
  }

  async findById(tx: Transaction, id: string): Promise<VacationRequest | null> {
    const row = await this.repo(tx).findOneBy({ id });
    return row ? toDomain(row) : null;
  }

  async findByIdempotencyKey(
    tx: Transaction,
    userId: string,
    key: string,
  ): Promise<VacationRequest | null> {
    const row = await this.repo(tx).findOneBy({ userId, idempotencyKey: key });
    return row ? toDomain(row) : null;
  }

  async findActiveOverlapping(
    tx: Transaction,
    userId: string,
    range: DateRange,
  ): Promise<VacationRequest | null> {
    // Same predicate as the exclusion constraint, so the GiST index serves it.
    const row = await this.repo(tx)
      .createQueryBuilder('vr')
      .where('vr.user_id = :userId', { userId })
      .andWhere('vr.status IN (:...active)', { active: ACTIVE_VACATION_REQUEST_STATUSES })
      .andWhere(`daterange(vr.start_date, vr.end_date, '[]') && daterange(:start, :end, '[]')`, {
        start: range.start,
        end: range.end,
      })
      .orderBy('vr.start_date', 'ASC')
      .getOne();
    return row ? toDomain(row) : null;
  }

  async insert(tx: Transaction, request: VacationRequest): Promise<void> {
    const s = request.snapshot();
    try {
      await entityManagerOf(tx).insert(VacationRequestEntity, {
        id: s.id,
        userId: s.userId,
        startDate: s.range.start,
        endDate: s.range.end,
        reason: s.reason,
        status: s.status,
        comments: s.comments,
        decidedById: s.decidedBy,
        decidedAt: s.decidedAt,
        idempotencyKey: s.idempotencyKey,
      });
    } catch (error) {
      const violation = asConstraintViolation(error);
      if (
        violation?.code === PG_ERROR.EXCLUSION_VIOLATION &&
        violation.constraint === 'vr_no_overlapping_active'
      ) {
        throw new VacationOverlapError();
      }
      if (
        violation?.code === PG_ERROR.UNIQUE_VIOLATION &&
        violation.constraint === 'vr_user_idempotency_key'
      ) {
        throw new IdempotencyKeyReusedError();
      }
      throw error;
    }
  }

  async saveDecision(tx: Transaction, request: VacationRequest): Promise<boolean> {
    const s = request.snapshot();
    const manager: EntityManager = entityManagerOf(tx);
    const result = await manager
      .createQueryBuilder()
      .update(VacationRequestEntity)
      .set({
        status: s.status,
        comments: s.comments,
        decidedById: s.decidedBy,
        decidedAt: s.decidedAt,
        updatedAt: () => 'now()',
      })
      .where('id = :id', { id: s.id })
      .andWhere(`status = 'PENDING'`) // compare-and-set: only a pending request can be decided
      .execute();
    return result.affected === 1;
  }
}
