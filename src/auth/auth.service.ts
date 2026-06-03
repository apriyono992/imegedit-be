import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RolesService } from '../roles/roles.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokensService } from './refresh-tokens.service';
import { JwtPayload } from './strategies/jwt.strategy';

const DEFAULT_ROLE = 'user';
const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly refreshTtlMs: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly refreshTokensService: RefreshTokensService,
    config: ConfigService,
  ) {
    const days = Number(config.get<string>('REFRESH_EXPIRES_DAYS', '7'));
    this.refreshTtlMs = days * 24 * 60 * 60 * 1000;
  }

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

  /** Exchange a valid refresh token for a new access token, rotating the refresh token. */
  async refresh(refreshToken: string) {
    const stored = await this.refreshTokensService.findValid(refreshToken);
    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.usersService.findById(stored.userId);
    if (!user || !user.active) {
      throw new UnauthorizedException();
    }
    // Rotate: invalidate the used refresh token before issuing a new pair.
    await this.refreshTokensService.revoke(refreshToken);
    return this.buildAuthResponse(user);
  }

  /** Revoke the given refresh token so it can no longer be exchanged. */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokensService.revoke(refreshToken);
  }

  private async buildAuthResponse(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
    };
    const refreshToken = await this.refreshTokensService.issue(
      user.id,
      this.refreshTtlMs,
    );
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
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
