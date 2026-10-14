import { type UserRole, USER_ROLES } from '@leaveflow/contracts';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

// Every column declares its type explicitly: esbuild (tsx, cef-build) emits no decorator metadata.
@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({ type: 'varchar', length: 100, name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: USER_ROLES, enumName: 'user_role' })
  role: UserRole;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
