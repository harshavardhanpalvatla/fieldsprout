import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationException extends Error {
  constructor(public readonly errors: unknown) {
    super('Validation failed');
  }
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ZodValidationException((result.error as ZodError).flatten());
    }
    return result.data;
  }
}
