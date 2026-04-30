import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Order, OrderSchema } from './schemas/order.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.mongodbUri') || 'mongodb://localhost:27017/ahia_orders',
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
