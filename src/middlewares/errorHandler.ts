import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errorCode = "INTERNAL_SERVER_ERROR";
  let details: any = null;

  // Handle Custom HttpError
  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    details = err.details;
  }
  // Handle Prisma Database Errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    details = err.meta || null;
    
    switch (err.code) {
      case "P2002": // Unique constraint failed
        statusCode = 409;
        const targetField = (err.meta?.target as string[])?.join(", ") || "field";
        message = `A record with this ${targetField} already exists.`;
        errorCode = "UNIQUE_CONSTRAINT_VIOLATION";
        break;
      case "P2003": // Foreign key constraint failed
        statusCode = 400;
        message = `Foreign key constraint failed on reference field.`;
        errorCode = "FOREIGN_KEY_VIOLATION";
        break;
      case "P2025": // Record not found
        statusCode = 404;
        message = "The requested record was not found.";
        errorCode = "RECORD_NOT_FOUND";
        break;
      default:
        statusCode = 400;
        message = `Database query error: ${err.message}`;
        errorCode = `PRISMA_ERROR_${err.code}`;
        break;
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = "Database validation failed. Please check your query parameters.";
    errorCode = "DATABASE_VALIDATION_ERROR";
    details = err.message;
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 500;
    message = "Unable to connect to the database.";
    errorCode = "DATABASE_CONNECTION_ERROR";
    details = err.message;
  }
  // Handle Zod validation errors
  else if (err.name === "ZodError" || err.issues) {
    statusCode = 400;
    message = "Validation failed.";
    errorCode = "VALIDATION_FAILED";
    const issues = err.issues || err.errors;
    if (Array.isArray(issues)) {
      details = issues.map((issue: any) => ({
        field: issue.path.slice(1).join(".") || issue.path.join("."), // slice(1) removes the root 'body', 'query', or 'params' key
        message: issue.message,
      }));
    } else {
      details = err;
    }
  }
  // Handle other built-in errors
  else if (err instanceof Error) {
    message = err.message;
    details = process.env.NODE_ENV === "development" ? err.stack : null;
  }

  // Log the error using winston logger
  logger.error(`${req.method} ${req.url} - Error: ${message}`, {
    statusCode,
    errorCode,
    details,
    stack: err instanceof Error ? err.stack : undefined,
  });

  // Send structured error response matching the required schema
  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
  });
};
