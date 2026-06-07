import type { Request, Response, NextFunction, RequestHandler } from "express";
import { AnyZodObject } from "zod";

/**
 * Zod validation middleware.
 * Validates request body, query parameters, and route parameters against a Zod schema.
 * Automatically sanitizes inputs (strips unregistered fields) and handles validation errors.
 */
export const validate = (schema: AnyZodObject): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Inject parsed/validated data (keeps only fields defined in schema)
      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;

      next();
    } catch (error) {
      next(error);
    }
  };
};
