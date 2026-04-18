import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Session configuration with express-session
  app.use(
    session({
      secret: 'your-secret-key-change-this-to-something-secure',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: false, // Set to true if using HTTPS
      }
    })
  );

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true // Important for cookies
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Connections++ API')
    .setDescription('REST API (NestJS)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3001);
  console.log('Backend running on http://localhost:3001');
  console.log('Swagger UI: http://localhost:3001/docs');
}
bootstrap();
