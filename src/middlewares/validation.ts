import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodObject } from "zod";

export const validate = (schema: ZodObject<any, any>): RequestHandler => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Inject parsed/validated data (keeps only fields defined in schema)
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      if (parsed.query !== undefined) {
        for (const key in req.query) {
          delete req.query[key];
        }
        Object.assign(req.query, parsed.query);
      }
      if (parsed.params !== undefined) {
        for (const key in req.params) {
          delete req.params[key];
        }
        Object.assign(req.params, parsed.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
