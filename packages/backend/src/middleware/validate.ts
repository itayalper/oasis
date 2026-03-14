import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Request, Response, NextFunction } from 'express';

const ajv = new Ajv({ allErrors: true, coerceTypes: false });
addFormats(ajv);

/**
 * Returns an Express middleware that validates req.body against the given
 * JSON Schema. On failure it responds 400 with structured error details
 * before the request reaches the handler.
 */
export function validate(schema: object) {
  const validateFn = ajv.compile(schema);
  return (req: Request, res: Response, next: NextFunction): void => {
    if (validateFn(req.body)) {
      next();
      return;
    }
    res.status(400).json({
      error: 'Validation failed',
      details: validateFn.errors?.map((e) => {
        const field = e.instancePath.replace(/^\//, '') || e.params?.['missingProperty'] || 'body';
        return `${field}: ${e.message}`;
      }),
    });
  };
}
