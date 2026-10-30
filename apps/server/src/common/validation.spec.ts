import { IsUUID } from 'class-validator';
import { createValidationPipe } from './validation.js';

class RequestDto {
  @IsUUID()
  id!: string;
}

describe('createValidationPipe', () => {
  const metadata = { type: 'body' as const, metatype: RequestDto };

  it('accepts and transforms valid input', async () => {
    const result = await createValidationPipe().transform(
      { id: '11111111-1111-4111-8111-111111111111' },
      metadata,
    );

    expect(result).toBeInstanceOf(RequestDto);
  });

  it('rejects unknown properties with the standard validation code', async () => {
    await expect(
      createValidationPipe().transform(
        {
          id: '11111111-1111-4111-8111-111111111111',
          unexpected: true,
        },
        metadata,
      ),
    ).rejects.toMatchObject({
      response: { code: 'VALIDATION_ERROR' },
      status: 400,
    });
  });
});
