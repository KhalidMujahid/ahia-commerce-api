import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE, APP_FILTER } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PrismaModule } from './prisma/prisma.module';
import { MongoModule } from './database/mongo/mongo.module';
import { CacheModule } from './cache/cache.module';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { DeliveryModule } from './delivery/delivery.module';

import configuration, {
  jwtConfig,
  databaseConfig,
  redisConfig,
} from './config/configuration';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, jwtConfig, databaseConfig, redisConfig],
      envFilePath: '.env',
    }),
    PrismaModule,
    MongoModule,
    CacheModule,
    EmailModule,
    AuthModule,
    UsersModule,
    VendorsModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    NotificationsModule,
    SearchModule,
    AnalyticsModule,
    DeliveryModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {
  static setupSwagger(app: any) {
    const config = new DocumentBuilder()
      .setTitle('AhiaGlobal API')
      .setDescription('AhiaGlobal Multi-Vendor Marketplace Backend API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
      )
      .addTag('Authentication', 'User authentication endpoints')
      .addTag('Delivery Companies', 'Delivery company onboarding and operations endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Vendors', 'Vendor management endpoints')
      .addTag('Products', 'Product management endpoints')
      .addTag('Categories', 'Category management endpoints')
      .addTag('Cart', 'Shopping cart endpoints')
      .addTag('Orders', 'Order management endpoints')
      .addTag('Payments', 'Payment processing endpoints')
      .addTag('Reviews', 'Review and Q&A endpoints')
      .addTag('Notifications', 'Notification endpoints')
      .addTag('Search', 'Search and recommendations endpoints')
      .addTag('Analytics', 'Analytics and reporting endpoints')
      .addTag('Admin', 'Administrative management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }
}
