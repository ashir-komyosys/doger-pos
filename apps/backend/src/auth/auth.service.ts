import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  STAFF_ROLES,
  type LoginDto,
  type PinLoginDto,
  type RegisterDto,
  type SessionUser,
} from '@nodedr-restaurant/types';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TwoFactorService } from './two-factor.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  private toSessionUser(user: {
    id: string;
    restaurantId: string;
    name: string;
    roleId: string;
    role: { name: string; permissions: { permission: { key: string } }[] };
  }): SessionUser {
    return {
      id: user.id,
      restaurantId: user.restaurantId,
      name: user.name,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, isActive: true },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Only asked for after the password is right, so the response never
    // reveals which emails exist or which accounts use two-factor.
    if (user.twoFactorEnabled) {
      await this.twoFactor.verifyLogin(user, dto.totp);
    }

    return this.issueSession(user);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists',
      );
    }

    // Permissions are global, not per-tenant — upsert (idempotent) outside
    // the transaction below rather than re-creating them per restaurant.
    // Seed these in one statement: a round trip per permission makes first
    // signup excessively slow on hosted PostgreSQL and transaction poolers.
    await this.prisma.permission.createMany({
      data: [...PERMISSIONS],
      skipDuplicates: true,
    });
    const allPermissions = await this.prisma.permission.findMany();
    const permissionByKey = new Map(allPermissions.map((p) => [p.key, p]));

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Initial setup creates every role and its permission links; keep the
    // remote-database transaction budget bounded but generous enough for setup.
    const owner = await this.prisma.$transaction(
      async (tx) => {
        const restaurant = await tx.restaurant.create({
          data: { name: dto.restaurantName, currency: 'PKR' },
        });
        const branch = await tx.branch.create({
          data: { restaurantId: restaurant.id, name: dto.branchName },
        });

        await tx.role.createMany({
          data: STAFF_ROLES.map((roleName) => ({
            restaurantId: restaurant.id,
            name: roleName,
            label: roleName.replace(/_/g, ' '),
          })),
        });
        const roles = await tx.role.findMany({
          where: { restaurantId: restaurant.id },
          select: { id: true, name: true },
        });
        const ownerRole = roles.find((role) => role.name === 'OWNER');
        if (!ownerRole) {
          throw new Error('Owner role was not created during registration');
        }

        const rolePermissionRows = roles.flatMap((role) => {
          const roleName = STAFF_ROLES.find((name) => name === role.name);
          if (!roleName) {
            throw new Error(
              `Unknown role created during registration: ${role.name}`,
            );
          }
          return DEFAULT_ROLE_PERMISSIONS[roleName]
            .map((key) => permissionByKey.get(key))
            .filter(
              (permission): permission is NonNullable<typeof permission> =>
                Boolean(permission),
            )
            .map((permission) => ({
              roleId: role.id,
              permissionId: permission.id,
            }));
        });
        await tx.rolePermission.createMany({
          data: rolePermissionRows,
        });

        const user = await tx.user.create({
          data: {
            restaurantId: restaurant.id,
            roleId: ownerRole.id,
            name: dto.ownerName,
            email: dto.email,
            passwordHash,
          },
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        });

        await tx.userBranch.create({
          data: { userId: user.id, branchId: branch.id },
        });

        return user;
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );

    return this.issueSession(owner);
  }

  async hasAnyRestaurant(): Promise<boolean> {
    const restaurant = await this.prisma.restaurant.findFirst({
      select: { id: true },
    });
    return restaurant !== null;
  }

  async pinLogin(dto: PinLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });

    if (!user || !user.isActive || !user.pinHash) {
      throw new UnauthorizedException('PIN login not available for this user');
    }
    // A 4-8 digit PIN must not be a way around the second factor.
    if (user.twoFactorEnabled) {
      throw new UnauthorizedException(
        'PIN login is off for accounts with two-factor authentication — sign in with your password',
      );
    }

    const valid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!valid) {
      throw new UnauthorizedException('Incorrect PIN');
    }

    return this.issueSession(user);
  }

  private async issueSession(
    user: Parameters<AuthService['toSessionUser']>[0],
  ) {
    const sessionUser = this.toSessionUser(user);
    const token = await this.jwt.signAsync({ sub: user.id });
    return { token, user: sessionUser };
  }
}
