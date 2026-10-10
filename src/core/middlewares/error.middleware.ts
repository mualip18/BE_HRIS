import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('====================================');
  console.error('API ERROR');
  console.error('METHOD:', req.method);
  console.error('URL:', req.originalUrl);
  console.error('MESSAGE:', err?.message);
  console.error('CODE:', err?.code);
  console.error('DETAIL:', err?.detail);
  console.error('HINT:', err?.hint);
  console.error('TABLE:', err?.table);
  console.error('COLUMN:', err?.column);
  console.error('CONSTRAINT:', err?.constraint);
  console.error('STACK:', err?.stack);
  console.error('====================================');

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: err?.message || 'Internal Server Error',
    error: {
      code: err?.code || null,
      detail: err?.detail || null,
      hint: err?.hint || null,
      table: err?.table || null,
      column: err?.column || null,
      constraint: err?.constraint || null,
    },
  });
};