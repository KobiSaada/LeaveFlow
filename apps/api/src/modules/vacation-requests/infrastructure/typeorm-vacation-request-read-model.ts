import {
  ACTIVE_VACATION_REQUEST_STATUSES,
  type IsoDate,
  type Page,
  type TeamCalendarEntry,
  type VacationRequestDto,
  type VacationRequestEventDto,
  type VacationRequestStatus,
} from '@leaveflow/contracts';
import type { DataSource, SelectQueryBuilder } from 'typeorm';
import { DomainEventEntity } from '../../../shared/database/domain-event.entity';
import { UserEntity } from '../../users/infrastructure/user.entity';
import type {
  VacationRequestListFilter,
  VacationRequestReadModel,
} from '../application/ports/vacation-request-read-model';
import { VacationRequestEntity } from './vacation-request.entity';

interface RequestRow {
  id: string;
  user_id: string;
  user_name: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: VacationRequestStatus;
  comments: string | null;
  decider_id: string | null;
  decider_name: string | null;
  decided_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toDto(row: RequestRow): VacationRequestDto {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    status: row.status,
    comments: row.comments,
    decidedBy:
      row.decider_id && row.decider_name ? { id: row.decider_id, name: row.decider_name } : null,
    decidedAt: row.decided_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class TypeOrmVacationRequestReadModel implements VacationRequestReadModel {
  constructor(private readonly dataSource: DataSource) {}

  /** One query with both names joined — no N+1. */
  private baseQuery(): SelectQueryBuilder<VacationRequestEntity> {
    return this.dataSource
      .getRepository(VacationRequestEntity)
      .createQueryBuilder('vr')
      .innerJoin(UserEntity, 'u', 'u.id = vr.user_id')
      .leftJoin(UserEntity, 'd', 'd.id = vr.decided_by')
      .select([
        'vr.id AS id',
        'vr.user_id AS user_id',
        'u.name AS user_name',
        'vr.start_date AS start_date',
        'vr.end_date AS end_date',
        'vr.reason AS reason',
        'vr.status AS status',
        'vr.comments AS comments',
        'd.id AS decider_id',
        'd.name AS decider_name',
        'vr.decided_at AS decided_at',
        'vr.created_at AS created_at',
        'vr.updated_at AS updated_at',
      ]);
  }

  async getById(id: string): Promise<VacationRequestDto | null> {
    const row = await this.baseQuery().where('vr.id = :id', { id }).getRawOne<RequestRow>();
    return row ? toDto(row) : null;
  }

  async list({
    userId,
    status,
    page,
    pageSize,
  }: VacationRequestListFilter): Promise<Page<VacationRequestDto>> {
    const applyFilters = <T extends SelectQueryBuilder<VacationRequestEntity>>(qb: T): T => {
      if (userId) qb.andWhere('vr.user_id = :userId', { userId });
      if (status) qb.andWhere('vr.status = :status', { status });
      return qb;
    };

    const [rows, totalItems] = await Promise.all([
      applyFilters(this.baseQuery().where('TRUE'))
        // id breaks ties so rows with equal created_at never repeat or vanish across pages.
        .orderBy('vr.created_at', 'DESC')
        .addOrderBy('vr.id', 'DESC')
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .getRawMany<RequestRow>(),
      applyFilters(
        this.dataSource.getRepository(VacationRequestEntity).createQueryBuilder('vr').where('TRUE'),
      ).getCount(),
    ]);

    return {
      items: rows.map(toDto),
      pageInfo: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async teamCalendar(from: IsoDate, to: IsoDate): Promise<TeamCalendarEntry[]> {
    const rows = await this.dataSource
      .getRepository(VacationRequestEntity)
      .createQueryBuilder('vr')
      .innerJoin(UserEntity, 'u', 'u.id = vr.user_id')
      // Projection deliberately excludes reason and comments.
      .select([
        'vr.id AS id',
        'vr.user_id AS user_id',
        'u.name AS user_name',
        'vr.start_date AS start_date',
        'vr.end_date AS end_date',
        'vr.status AS status',
      ])
      .where('vr.status IN (:...active)', { active: ACTIVE_VACATION_REQUEST_STATUSES })
      .andWhere(`daterange(vr.start_date, vr.end_date, '[]') && daterange(:from, :to, '[]')`, {
        from,
        to,
      })
      .orderBy('vr.start_date', 'ASC')
      .addOrderBy('u.name', 'ASC')
      .getRawMany<{
        id: string;
        user_id: string;
        user_name: string;
        start_date: string;
        end_date: string;
        status: 'PENDING' | 'APPROVED';
      }>();
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
    }));
  }

  async events(requestId: string): Promise<VacationRequestEventDto[]> {
    const rows = await this.dataSource
      .getRepository(DomainEventEntity)
      .createQueryBuilder('e')
      .innerJoin(UserEntity, 'a', 'a.id = e.actor_id')
      .select([
        'e.id AS id',
        'e.event_type AS event_type',
        'a.id AS actor_id',
        'a.name AS actor_name',
        'e.occurred_at AS occurred_at',
      ])
      .where('e.aggregate_id = :requestId', { requestId })
      .orderBy('e.seq', 'ASC')
      .getRawMany<{
        id: string;
        event_type: VacationRequestEventDto['eventType'];
        actor_id: string;
        actor_name: string;
        occurred_at: Date;
      }>();
    return rows.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      actor: { id: r.actor_id, name: r.actor_name },
      occurredAt: r.occurred_at.toISOString(),
    }));
  }
}
