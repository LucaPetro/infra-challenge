import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SucessResponseInterceptor } from 'src/common/sucess-response.interceptor';
import { ProductVariationModule } from './ProductVariation/ProductVariation.module';

@Module({
  imports: [ProductVariationModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: SucessResponseInterceptor,
    },
  ],
})
export class ApiModule {}
