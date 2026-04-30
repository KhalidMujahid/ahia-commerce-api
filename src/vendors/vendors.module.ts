import { Module } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Service } from './s3/s3.service';

@Module({
  imports: [PrismaModule],
  controllers: [VendorsController],
  providers: [VendorsService, S3Service],
  exports: [VendorsService, S3Service],
})
export class VendorsModule {}
