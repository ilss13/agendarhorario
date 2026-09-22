import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { FirebaseIdentityToolkitClient } from './firebase-identity-toolkit.client';

jest.mock('axios');

describe('FirebaseIdentityToolkitClient', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('web-api-key'),
  } as unknown as ConfigService;
  const client = new FirebaseIdentityToolkitClient(config);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(config.getOrThrow).mockReturnValue('web-api-key');
    jest.mocked(axios.isAxiosError).mockImplementation((err: unknown) => err instanceof AxiosError);
  });

  const successBody = {
    idToken: 'id',
    refreshToken: 'refresh',
    expiresIn: '3600',
    localId: 'uid',
    email: 'a@b.com',
  };

  const axiosAuthError = (message: string, status = 400): AxiosError => {
    const err = new AxiosError('fail');
    err.response = {
      status,
      data: { error: { message } },
      statusText: 'Error',
      headers: {},
      config: {} as never,
    };
    return err;
  };

  it('signInWithPassword returns identity toolkit payload on success', async () => {
    jest.mocked(axios.post).mockResolvedValue({ data: successBody });

    await expect(client.signInWithPassword('a@b.com', 'secret')).resolves.toEqual(successBody);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('signInWithPassword?key=web-api-key'),
      { email: 'a@b.com', password: 'secret', returnSecureToken: true },
    );
  });

  it('signUpWithPassword returns identity toolkit payload on success', async () => {
    jest.mocked(axios.post).mockResolvedValue({ data: successBody });

    await expect(client.signUpWithPassword('a@b.com', 'secret')).resolves.toEqual(successBody);
  });

  it('maps EMAIL_NOT_FOUND axios errors to invalid credentials message', async () => {
    jest.mocked(axios.post).mockRejectedValue(axiosAuthError('EMAIL_NOT_FOUND'));

    try {
      await client.signInWithPassword('a@b.com', 'x');
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(400);
      expect((err as HttpException).getResponse()).toEqual({
        message: 'Email ou senha inválidos',
        code: 'EMAIL_NOT_FOUND',
      });
    }
  });

  it('maps EMAIL_EXISTS on signUp', async () => {
    jest.mocked(axios.post).mockRejectedValue(axiosAuthError('EMAIL_EXISTS'));

    try {
      await client.signUpWithPassword('a@b.com', 'x');
      fail('expected throw');
    } catch (err) {
      expect((err as HttpException).getResponse()).toEqual({
        message: 'Email já cadastrado',
        code: 'EMAIL_EXISTS',
      });
    }
  });

  it('maps USER_DISABLED, WEAK_PASSWORD and TOO_MANY_ATTEMPTS codes', async () => {
    const cases: Array<{ code: string; message: string }> = [
      { code: 'USER_DISABLED', message: 'Conta desativada' },
      { code: 'WEAK_PASSWORD', message: 'Senha muito fraca' },
      {
        code: 'TOO_MANY_ATTEMPTS_TRY_LATER',
        message: 'Muitas tentativas. Tente novamente em instantes.',
      },
    ];

    for (const c of cases) {
      jest.mocked(axios.post).mockRejectedValue(axiosAuthError(c.code));
      try {
        await client.signInWithPassword('a@b.com', 'x');
        fail(`expected throw for ${c.code}`);
      } catch (err) {
        expect((err as HttpException).getResponse()).toEqual({
          message: c.message,
          code: c.code,
        });
      }
    }
  });

  it('falls back to default message for unknown firebase codes', async () => {
    jest.mocked(axios.post).mockRejectedValue(axiosAuthError('UNKNOWN_CODE', 401));

    try {
      await client.signInWithPassword('a@b.com', 'x');
      fail('expected throw');
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(401);
      expect((err as HttpException).getResponse()).toEqual({
        message: 'Credenciais inválidas',
        code: 'UNKNOWN_CODE',
      });
    }
  });

  it('wraps non-axios errors as unauthorized HttpException', async () => {
    jest.mocked(axios.post).mockRejectedValue(new Error('network down'));

    try {
      await client.signUpWithPassword('a@b.com', 'x');
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect((err as HttpException).getResponse()).toBe('Não foi possível criar a conta');
    }
  });

  it('defaults status to UNAUTHORIZED when axios error has no response', async () => {
    jest.mocked(axios.post).mockRejectedValue(new AxiosError('fail'));

    try {
      await client.signInWithPassword('a@b.com', 'x');
      fail('expected throw');
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    }
  });
});
