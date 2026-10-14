import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * SPEC-005: the end date is the first day back at work, so a vacation covers [start_date, end_date).
 * Back-to-back requests (one ends on the 13th, the next starts on the 13th) no longer overlap.
 * Relaxing change: every row valid under the inclusive constraint is valid under this one.
 */
export class HalfOpenVacationRanges1760518800000 implements MigrationInterface {
  name = 'HalfOpenVacationRanges1760518800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE vacation_requests DROP CONSTRAINT vr_no_overlapping_active`,
    );
    await queryRunner.query(`
      ALTER TABLE vacation_requests ADD CONSTRAINT vr_no_overlapping_active EXCLUDE USING gist (
        user_id WITH =,
        daterange(start_date, end_date, '[)') WITH &&
      ) WHERE (status IN ('PENDING', 'APPROVED'))`);
  }

  /** Restores the inclusive form. Fails if back-to-back active requests exist (they would overlap). */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE vacation_requests DROP CONSTRAINT vr_no_overlapping_active`,
    );
    await queryRunner.query(`
      ALTER TABLE vacation_requests ADD CONSTRAINT vr_no_overlapping_active EXCLUDE USING gist (
        user_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
      ) WHERE (status IN ('PENDING', 'APPROVED'))`);
  }
}
