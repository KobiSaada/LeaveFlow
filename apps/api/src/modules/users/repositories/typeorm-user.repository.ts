import type { PublicUser, UserRole } from '@leaveflow/contracts';
import type { DataSource } from 'typeorm';
import type { UserCredentials, UserRepository } from './user.repository';
import { UserEntity } from '../entities/user.entity';

const toPublicUser = (row: UserEntity): PublicUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
});

export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<PublicUser | null> {
    const row = await this.dataSource.getRepository(UserEntity).findOneBy({ id });
    return row ? toPublicUser(row) : null;
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    // password_hash is `select: false` on the entity; opt in explicitly here and nowhere else.
    const row = await this.dataSource
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
    return row ? { ...toPublicUser(row), passwordHash: row.passwordHash } : null;
  }

  async list({ role, limit }: { role?: UserRole; limit: number }): Promise<PublicUser[]> {
    const rows = await this.dataSource.getRepository(UserEntity).find({
      where: role ? { role } : {},
      order: { name: 'ASC', id: 'ASC' },
      take: limit,
    });
    return rows.map(toPublicUser);
  }
}
