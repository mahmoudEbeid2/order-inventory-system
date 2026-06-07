export class HttpError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details: any;

  constructor(statusCode: number, message: string, errorCode: string = "INTERNAL_SERVER_ERROR", details: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string, details: any = null) {
    super(400, message, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string, details: any = null) {
    super(404, message, "NOT_FOUND", details);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, details: any = null) {
    super(409, message, "CONFLICT", details);
  }
}

const DEFAULT_ERRORS: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
};

export const createError = (
  statusCode: number,
  message: string,
  errorCode?: string,
  details: any = null
): HttpError => {
  const code = errorCode || DEFAULT_ERRORS[statusCode] || "INTERNAL_SERVER_ERROR";
  return new HttpError(statusCode, message, code, details);
};
