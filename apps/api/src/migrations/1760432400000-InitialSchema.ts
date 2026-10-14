import { type MigrationInterface, type QueryRunner } from 'typeorm';

/**
 * Initial schema (SPEC-001 epic §10.1). Business invariants live in the database as well as in the
 * domain: the exclusion constraint makes "no overlapping active requests" hold under concurrency.
 */
export class InitialSchema1760432400000 implements MigrationInterface {
  name = 'InitialSchema1760432400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('REQUESTER', 'VALIDATOR')`);
    await queryRunner.query(
      `CREATE TYPE vacation_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED')`,
    );

    await queryRunner.query(`
      CREATE TABLE users (
        id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name          varchar(100) NOT NULL,
        email         varchar(254) NOT NULL,
        password_hash varchar(100) NOT NULL,
        role          user_role    NOT NULL,
        created_at    timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT users_email_lowercase CHECK (email = lower(email))
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX users_email_key ON users (email)`);

    await queryRunner.query(`
      CREATE TABLE vacation_requests (
        id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        start_date      date NOT NULL,
        end_date        date NOT NULL,
        reason          varchar(500),
        status          vacation_request_status NOT NULL DEFAULT 'PENDING',
        comments        varchar(1000),
        decided_by      uuid REFERENCES users(id) ON DELETE RESTRICT,
        decided_at      timestamptz,
        idempotency_key uuid,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT vr_end_after_start CHECK (end_date > start_date),
        CONSTRAINT vr_rejection_needs_comment
          CHECK (status <> 'REJECTED' OR (comments IS NOT NULL AND btrim(comments) <> '')),
        CONSTRAINT vr_decision_consistency CHECK (
          (status = 'PENDING' AND decided_by IS NULL AND decided_at IS NULL AND comments IS NULL)
          OR (status <> 'PENDING' AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
        ),
        CONSTRAINT vr_no_overlapping_active EXCLUDE USING gist (
          user_id WITH =,
          daterange(start_date, end_date, '[]') WITH &&
        ) WHERE (status IN ('PENDING', 'APPROVED'))
      )`);
    await queryRunner.query(
      `CREATE INDEX vr_user_created_idx ON vacation_requests (user_id, created_at DESC, id DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX vr_status_created_idx ON vacation_requests (status, created_at DESC, id DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX vr_created_idx ON vacation_requests (created_at DESC, id DESC)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX vr_user_idempotency_key ON vacation_requests (user_id, idempotency_key)
       WHERE idempotency_key IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE domain_events (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        aggregate_type varchar(50)  NOT NULL,
        aggregate_id   uuid         NOT NULL,
        event_type     varchar(100) NOT NULL,
        payload        jsonb        NOT NULL,
        actor_id       uuid         NOT NULL REFERENCES users(id),
        occurred_at    timestamptz  NOT NULL DEFAULT now()
      )`);
    await queryRunner.query(
      `CREATE INDEX domain_events_aggregate_idx ON domain_events (aggregate_id, occurred_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS domain_events`);
    await queryRunner.query(`DROP TABLE IF EXISTS vacation_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TYPE IF EXISTS vacation_request_status`);
    await queryRunner.query(`DROP TYPE IF EXISTS user_role`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS btree_gist`);
  }
}
