import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import type { Handler, Context, APIGatewayProxyEventV2 } from 'aws-lambda';

let serverProxy: Handler | null = null;

async function configure() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }))

  app.setGlobalPrefix('inventory')

  app.enableCors()

  return app
}

async function bootstrap(): Promise<Handler> {
  if (!serverProxy) {
    const app = await configure()
    await app.init()
  
    const express = app.getHttpAdapter().getInstance()
  
    serverProxy = serverlessExpress({ app: express })
  }
  return serverProxy;
}

export const handler: Handler = async (event: APIGatewayProxyEventV2, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const server = await bootstrap();

  return server(event, context, undefined as any)
}

if (process.env.NODE_ENV === 'local') {
  configure().then((app) => app.listen(3000))
}


