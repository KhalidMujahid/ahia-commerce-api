import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { S3Service } from 'src/vendors/s3/s3.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [ProductsController],
  providers: [ProductsService, S3Service],
  exports: [ProductsService],
})
export class ProductsModule {}
