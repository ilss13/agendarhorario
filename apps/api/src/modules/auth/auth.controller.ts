import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  forgotPasswordRequestSchema,
  GoogleLoginRequest,
  googleLoginRequestSchema,
  LoginRequest,
  loginRequestSchema,
  MeResponse,
  RegisterCompanyRequest,
  registerCompanyRequestSchema,
  RegisterCustomerRequest,
  registerCustomerRequestSchema,
  ResetPasswordRequest,
  ResetPasswordResponse,
  resetPasswordRequestSchema,
} from '@agendarhorario/contracts';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { AuthService, SessionResult } from './auth.service';
import { AuthGuard, Public } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './auth.types';

@ApiTags('auth')
@Controller('auth')
@UseGuards(AuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register-company')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerCompanyRequestSchema))
  async registerCompany(
    @Body() input: RegisterCompanyRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const { session, me } = await this.authService.registerCompany(input);
    this.setSessionCookie(res, session);
    return me;
  }

  @Public()
  @Post('register-customer')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(registerCustomerRequestSchema))
  async registerCustomer(
    @Body() input: RegisterCustomerRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const { session, me } = await this.authService.registerCustomer(input);
    this.setSessionCookie(res, session);
    return me;
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(loginRequestSchema))
  async login(
    @Body() input: LoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const { session, me } = await this.authService.login(input);
    this.setSessionCookie(res, session);
    return me;
  }

  @Public()
  @Post('login/google')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(googleLoginRequestSchema))
  async loginGoogle(
    @Body() input: GoogleLoginRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MeResponse> {
    const { session, me } = await this.authService.loginWithGoogle(input);
    this.setSessionCookie(res, session);
    return me;
  }

  @Public()
  @Post('password/forgot')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(forgotPasswordRequestSchema))
  @ApiOperation({ summary: 'Envia o e-mail para redefinir a senha' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: { email: { type: 'string', format: 'email' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pedido aceito. A resposta é a mesma quando o e-mail não existe.',
    schema: {
      type: 'object',
      required: ['sent'],
      properties: { sent: { type: 'boolean', enum: [true] } },
    },
  })
  @ApiResponse({ status: 400, description: 'E-mail inválido ou falha ao enviar' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas' })
  requestPasswordReset(@Body() input: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    return this.authService.requestPasswordReset(input.email);
  }

  @Public()
  @Post('password/reset')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(resetPasswordRequestSchema))
  @ApiOperation({ summary: 'Define uma nova senha a partir do link recebido por e-mail' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['oobCode', 'password'],
      properties: {
        oobCode: { type: 'string', minLength: 10 },
        password: { type: 'string', minLength: 8 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Senha atualizada',
    schema: {
      type: 'object',
      required: ['reset'],
      properties: { reset: { type: 'boolean', enum: [true] } },
    },
  })
  @ApiResponse({ status: 400, description: 'Link inválido, expirado ou senha fraca' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas' })
  resetPassword(@Body() input: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    return this.authService.resetPassword(input);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const cookieName = this.config.get<string>('SESSION_COOKIE_NAME') ?? '__session';
    await this.authService.logout(req.cookies?.[cookieName]);
    res.clearCookie(cookieName, {
      domain: this.config.get<string>('SESSION_COOKIE_DOMAIN'),
      path: '/',
    });
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser): MeResponse {
    return this.authService.me(user);
  }

  private setSessionCookie(res: Response, session: SessionResult): void {
    res.cookie(
      this.config.get<string>('SESSION_COOKIE_NAME') ?? '__session',
      session.sessionCookie,
      {
        maxAge: session.expiresInMs,
        httpOnly: true,
        secure: this.config.get<boolean>('SESSION_COOKIE_SECURE') === true,
        sameSite: 'lax',
        domain: this.config.get<string>('SESSION_COOKIE_DOMAIN'),
        path: '/',
      },
    );
  }
}
