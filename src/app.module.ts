import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/user.entity';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite', // DB타입
      database: 'nest-auth-test.sqlite', // DB파일명
      entities: [User], // 엔티티 리스트
      synchronize: true, // DB에 스키마를 동기화 - 개발용으로만 사용한다.
      logging: true, // SQL실행로그 확인 - 개발용으로만 사용한다.
    }),
    UserModule,
    AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
