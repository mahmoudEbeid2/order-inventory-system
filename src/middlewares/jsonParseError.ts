import type { Request, Response, NextFunction } from "express";

export const jsonParseError = (err: any, _req: Request, res: Response, next: NextFunction): void => {
  if (err.type === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      message: "Invalid JSON in request body",
      error: {
        code: "INVALID_JSON",
        details: null,
      },
    });
    return;
  }
  next(err);
};
