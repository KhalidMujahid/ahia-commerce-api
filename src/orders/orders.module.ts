import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from '../database/mongo/schemas/order.schema';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    PrismaModule,
    CacheModule,
    DeliveryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
