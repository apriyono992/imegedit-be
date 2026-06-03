import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { QueryUsersDto } from './dto/query-users.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findAll(query: QueryUsersDto): Promise<PaginatedResult<User>> {
    const qb = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role');

    if (query.roleId !== undefined) {
      qb.andWhere('user.roleId = :roleId', { roleId: query.roleId });
    }
    if (query.active !== undefined) {
      qb.andWhere('user.active = :active', { active: query.active });
    }

    return paginate(qb, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      searchableColumns: ['user.name', 'user.email', 'role.name'],
      sortableColumns: {
        name: 'user.name',
        email: 'user.email',
        active: 'user.active',
        role: 'role.name',
        createdAt: 'user.createdAt',
      },
      defaultSortBy: 'createdAt',
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: { role: true },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { role: true },
    });
  }

  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.findByIdOrFail(id);
    // Column-level update avoids the stale-relation overwriting roleId on save.
    await this.usersRepository.update(id, data);
    return this.findByIdOrFail(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.findByIdOrFail(id);
    await this.usersRepository.softDelete(id);
  }
}
