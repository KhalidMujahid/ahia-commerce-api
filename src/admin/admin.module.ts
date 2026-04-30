import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UsersModule } from '../users/users.module';
import { VendorsModule } from '../vendors/vendors.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/orders.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [
    UsersModule,
    VendorsModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    ReviewsModule,
    AnalyticsModule,
    DeliveryModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
