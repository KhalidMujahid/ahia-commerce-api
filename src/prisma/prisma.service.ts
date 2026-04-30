import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const datasourceUrl = PrismaService.buildDatasourceUrl(process.env.DATABASE_URL);

    super({
      log: ['query', 'info', 'warn', 'error'],
      datasourceUrl,
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Disconnected from PostgreSQL database');
    } catch (error) {
      this.logger.error('Error disconnecting from PostgreSQL', error);
    }
  }

  async cleanDatabase() {
    const tables = ['ActivityLog', 'Notification', 'WalletTransaction', 'Wallet', 'Payout', 'Payment', 'Review', 'ProductSpecification', 'ProductImage', 'ProductVariant', 'Product', 'Address', 'Vendor', 'User', 'Category', 'Setting'];
    
    for (const table of tables) {
      try {
        await this.$executeRawUnsafe(`DELETE FROM "${table}" CASCADE`);
      } catch (error) {
        this.logger.error(`Error cleaning table ${table}`, error);
      }
    }
  }

  private static buildDatasourceUrl(databaseUrl?: string) {
    if (!databaseUrl) {
      return databaseUrl;
    }

    try {
      const parsed = new URL(databaseUrl);
      const isNeonPooler = parsed.hostname.includes('-pooler.');

      if (isNeonPooler && !parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true');
      }

      if (!parsed.searchParams.has('connect_timeout')) {
        parsed.searchParams.set('connect_timeout', '15');
      }

      return parsed.toString();
    } catch {
      return databaseUrl;
    }
  }
}
