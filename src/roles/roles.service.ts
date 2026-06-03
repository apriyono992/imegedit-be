import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

export const DEFAULT_ROLES = ['user', 'admin'] as const;

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  /** Seed the default roles on startup; idempotent. */
  async onModuleInit(): Promise<void> {
    for (const name of DEFAULT_ROLES) {
      const role = await this.findOrCreate(name);
      this.logger.log(`Role ready: ${role.name} (id=${role.id})`);
    }
  }

  findById(id: number): Promise<Role | null> {
    return this.rolesRepository.findOne({ where: { id } });
  }

  /** Find a role by name, creating it if it does not exist yet. */
  async findOrCreate(name: string): Promise<Role> {
    const existing = await this.rolesRepository.findOne({ where: { name } });
    if (existing) {
      return existing;
    }
    const role = this.rolesRepository.create({ name });
    return this.rolesRepository.save(role);
  }
}
