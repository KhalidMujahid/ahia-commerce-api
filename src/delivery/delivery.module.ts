import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryService } from './delivery.service';
import { Order, OrderSchema } from '../database/mongo/schemas/order.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeliveryController } from './delivery.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    NotificationsModule,
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
