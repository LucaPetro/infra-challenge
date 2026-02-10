import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeORMConf } from './db/typeorm/datasource';
import { ProductVariationModule } from './api/ProductVariation/ProductVariation.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production'
          ? 'info'
          : 'debug',
        // redact: ['req.headers.authorization']
      }
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => getTypeORMConf()
    }),
    ProductVariationModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
