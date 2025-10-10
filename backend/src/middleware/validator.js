import { z } from 'zod';
import { ValidationError } from './errorHandler.js';

export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const data = {
        body: req.body,
        query: req.query,
        params: req.params
      };

      const validated = await schema.parseAsync(data);

      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
};

export const uploadFileSchema = z.object({
  body: z.object({}).optional()
});

export const jobIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID format')
  })
});

export const startJobSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid job ID format')
  }),
  body: z.object({}).optional()
});

