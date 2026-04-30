import { Module } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';

@Module({
  providers: [TwoFactorService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
