import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for all origins (frontend compatibility)
  app.enableCors({
    origin: true,
    credentials: true,
  });


  // Enable global validation pipe with automatic transformations
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configure Swagger UI
  const config = new DocumentBuilder()
    .setTitle('CRM Workflow Automation API')
    .setDescription('API documentation for managing queues, stages, steps, buttons, transitions, and leads.')
    .setVersion('1.0')
    .addTag('leads', 'Lead and customer management lifecycle')
    .addTag('queues', 'Pipeline funnel management')
    .addTag('stages', 'Queue columns/stages management')
    .addTag('steps', 'Interactive steps, buttons, and transitions')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/api`);
}
bootstrap();
