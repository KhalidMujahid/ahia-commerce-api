import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type SeedUserConfig = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
};

function getSeedUserConfig(prefix: 'ADMIN' | 'SUPER_ADMIN', role: UserRole): SeedUserConfig {
  const normalizedRole = prefix === 'SUPER_ADMIN' ? 'super-admin' : 'admin';

  return {
    email: process.env[`DEFAULT_${prefix}_EMAIL`] || `${normalizedRole}@ahia.local`,
    password: process.env[`DEFAULT_${prefix}_PASSWORD`] || 'Admin123!',
    username: process.env[`DEFAULT_${prefix}_USERNAME`] || normalizedRole.replace('-', '_'),
    firstName: process.env[`DEFAULT_${prefix}_FIRST_NAME`] || 'System',
    lastName: process.env[`DEFAULT_${prefix}_LAST_NAME`] || prefix === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin',
    role,
  };
}

async function upsertPrivilegedUser(config: SeedUserConfig) {
  const hashedPassword = await bcrypt.hash(config.password, 10);

  return prisma.user.upsert({
    where: { email: config.email },
    update: {
      username: config.username,
      password: hashedPassword,
      firstName: config.firstName,
      lastName: config.lastName,
      role: config.role,
      isActive: true,
      isEmailVerified: true,
    },
    create: {
      email: config.email,
      username: config.username,
      password: hashedPassword,
      firstName: config.firstName,
      lastName: config.lastName,
      role: config.role,
      isActive: true,
      isEmailVerified: true,
    },
  });
}

async function main() {
  const adminConfig = getSeedUserConfig('ADMIN', UserRole.ADMIN);
  const superAdminConfig = getSeedUserConfig('SUPER_ADMIN', UserRole.SUPER_ADMIN);

  const [admin, superAdmin] = await Promise.all([
    upsertPrivilegedUser(adminConfig),
    upsertPrivilegedUser(superAdminConfig),
  ]);

  console.log(`Seeded admin user: ${admin.email}`);
  console.log(`Seeded super admin user: ${superAdmin.email}`);
}

main()
  .catch((error) => {
    console.error('Failed to seed privileged users', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
