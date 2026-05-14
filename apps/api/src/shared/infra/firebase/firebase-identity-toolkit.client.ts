import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

interface SignInResponse {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
}

type SignUpResponse = SignInResponse;

const BASE_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

@Injectable()
export class FirebaseIdentityToolkitClient {
  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    return this.config.getOrThrow<string>('FIREBASE_WEB_API_KEY');
  }

  async signInWithPassword(email: string, password: string): Promise<SignInResponse> {
    try {
      const { data } = await axios.post<SignInResponse>(
        `${BASE_URL}:signInWithPassword?key=${this.apiKey}`,
        { email, password, returnSecureToken: true },
      );
      return data;
    } catch (err) {
      throw this.mapError(err, 'Credenciais inválidas');
    }
  }

  async signUpWithPassword(email: string, password: string): Promise<SignUpResponse> {
    try {
      const { data } = await axios.post<SignUpResponse>(`${BASE_URL}:signUp?key=${this.apiKey}`, {
        email,
        password,
        returnSecureToken: true,
      });
      return data;
    } catch (err) {
      throw this.mapError(err, 'Não foi possível criar a conta');
    }
  }

  private mapError(err: unknown, defaultMessage: string): HttpException {
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
      const code = axiosErr.response?.data?.error?.message;
      const status = axiosErr.response?.status ?? HttpStatus.UNAUTHORIZED;
      const message = mapFirebaseAuthCode(code) ?? defaultMessage;
      return new HttpException({ message, code }, status);
    }
    return new HttpException(defaultMessage, HttpStatus.UNAUTHORIZED);
  }
}

const mapFirebaseAuthCode = (code: string | undefined): string | null => {
  if (!code) return null;
  if (code.startsWith('EMAIL_NOT_FOUND') || code.startsWith('INVALID_PASSWORD'))
    return 'Email ou senha inválidos';
  if (code.startsWith('USER_DISABLED')) return 'Conta desativada';
  if (code.startsWith('EMAIL_EXISTS')) return 'Email já cadastrado';
  if (code.startsWith('TOO_MANY_ATTEMPTS'))
    return 'Muitas tentativas. Tente novamente em instantes.';
  if (code.startsWith('WEAK_PASSWORD')) return 'Senha muito fraca';
  return null;
};
