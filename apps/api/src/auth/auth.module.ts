import { Global, Module } from '@nestjs/common';
import { CaptchaService } from '../common/captcha.service.js';
import { MeController } from '../users/me.controller.js';
import { MeService } from '../users/me.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { LoginAttemptsService } from './login-attempts.service.js';
import { PasswordService } from './password.service.js';
import { SessionService } from './session.service.js';
import { TokensService } from './tokens.service.js';

@Global()
@Module({
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    MeService,
    PasswordService,
    SessionService,
    TokensService,
    LoginAttemptsService,
    CaptchaService,
  ],
  exports: [SessionService, TokensService, PasswordService, CaptchaService],
})
export class AuthModule {}
