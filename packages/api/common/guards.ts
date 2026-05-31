import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt'; // ADDED
import { ROLES_KEY, PERMISSIONS_KEY } from './decorators';
import { hasPermission } from './rbac.config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {} // Inject JwtService

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization Header');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid Token Format');
    }

    try {
      // 1. Verify Real JWT
      const payload = await this.jwtService.verifyAsync(token);
      
      // 2. Attach user to request object
      request.user = { 
        id: payload.sub, 
        roles: [payload.role] 
      };
      
      return true;
    } catch (error) {
       throw new UnauthorizedException('Token Expired or Invalid');
    }
  }
}

/**
 * Role-based access guard with hierarchy support.
 *
 * Hierarchy rules:
 *   - SUPER and SUPERADMIN bypass all role checks (wildcard access)
 *   - ADMIN is treated as equivalent to OPERATIONS (backwards compatibility)
 *   - All other roles must match exactly
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) return false; // Strict check

    const userRoles: string[] = user.roles || [];

    // SUPER and SUPERADMIN bypass all role checks
    if (userRoles.includes('SUPER') || userRoles.includes('SUPERADMIN')) {
      return true;
    }

    return requiredRoles.some((role) => {
      if (userRoles.includes(role)) return true;

      // ADMIN (legacy) is equivalent to OPERATIONS
      if (role === 'ADMIN' && userRoles.includes('OPERATIONS')) return true;
      if (role === 'OPERATIONS' && userRoles.includes('ADMIN')) return true;

      return false;
    });
  }
}

/**
 * Permission-based access guard.
 * Checks granular permissions from the RBAC config map.
 * Use with @Permissions('resource.action') decorator.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions) {
      return true; // No permissions required — allow access
    }
    const { user } = context.switchToHttp().getRequest();

    if (!user) return false;

    const userRoles: string[] = user.roles || [];

    // Check if ANY of the user's roles has ALL required permissions
    return userRoles.some((role) =>
      requiredPermissions.every((perm) => hasPermission(role, perm)),
    );
  }
}