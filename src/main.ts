import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  app.use(
    session({
      secret: 'very-important-secret', // 세션 암호화 키
      resave: false, // 세션을 항상 저장할지 여부
      saveUninitialized: false, // 세션이 저장되기 전에는 초기화 하지 않은 상태로 세션을 미리 만들어 저장
      cookie: { maxAge: 3600000 }, // 쿠키 유효기간 1시간
    }),
  );
  // passport 초기화 및 세션 저장소 초기화
  app.use(passport.initialize());
  app.use(passport.session()); // 저장소를 설정하지 않으면 메모리에 저장됨

  await app.listen(4000);
}
bootstrap();
