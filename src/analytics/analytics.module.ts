import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../database/mongo/schemas/order.schema';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
