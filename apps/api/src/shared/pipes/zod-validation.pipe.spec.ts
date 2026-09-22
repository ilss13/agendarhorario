import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });
  const pipe = new ZodValidationPipe(schema);

  it('returns parsed data when value is valid', () => {
    expect(pipe.transform({ name: 'Ada', age: 30 })).toEqual({ name: 'Ada', age: 30 });
  });

  it('throws BadRequestException when value fails schema', () => {
    expect(() => pipe.transform({ name: '', age: -1 })).toThrow(BadRequestException);
  });

  it('includes flattened field errors in BadRequestException response', () => {
    try {
      pipe.transform({ name: '' });
      fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse();
      expect(body).toEqual(
        expect.objectContaining({
          message: 'Dados inválidos',
          errors: expect.objectContaining({
            name: expect.any(Array),
            age: expect.any(Array),
          }),
        }),
      );
    }
  });
});
