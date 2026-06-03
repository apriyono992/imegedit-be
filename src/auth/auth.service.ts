import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { RolesService } from '../roles/roles.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RevokedTokensService } from './revoked-tokens.service';
import { JwtPayload } from './strategies/jwt.strategy';

const DEFAULT_ROLE = 'user';
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly revokedTokensService: RevokedTokensService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const role = dto.roleId
      ? await this.rolesService.findById(dto.roleId)
      : await this.rolesService.findOrCreate(DEFAULT_ROLE);
    if (!role) {
      throw new ConflictException('Role not found');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      roleId: role.id,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.active) {
      throw new UnauthorizedException('Account is inactive');
    }
    return this.buildAuthResponse(user);
  }

  /** Revoke the given access token so it can no longer be used. */
  async logout(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token) as {
      jti?: string;
      sub?: string;
      exp?: number;
    } | null;
    if (decoded?.jti) {
      const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date();
      await this.revokedTokensService.revoke(
        decoded.jti,
        decoded.sub ?? null,
        expiresAt,
      );
    }
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      jti: randomUUID(),
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roleId: user.roleId,
        active: user.active,
      },
    };
  }
}
