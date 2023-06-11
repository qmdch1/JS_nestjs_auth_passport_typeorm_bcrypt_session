import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import {PassportModule} from '@nestjs/passport';
import { SessionSerializer } from './session.serializer';
import { LocalStrategy } from './local.strategy';
<<<<<<< HEAD
import { GoogleStrategy } from './google.strategy';

@Module({
  imports: [UserModule, PassportModule.register({ session: true})],
  providers: [AuthService, LocalStrategy, SessionSerializer, GoogleStrategy],
=======

@Module({
  imports: [UserModule, PassportModule.register({ session: true})],
  providers: [AuthService, LocalStrategy, SessionSerializer],
>>>>>>> origin/master
  controllers: [AuthController]
})
export class AuthModule {}
