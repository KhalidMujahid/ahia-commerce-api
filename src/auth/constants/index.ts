import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  DELIVERY_COMPANY = 'DELIVERY_COMPANY',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export const ROLE_GUARD_METADATA_KEY = 'role';

export const Public = () => SetMetadata('isPublic', true);

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
