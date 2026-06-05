import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'fail',
      errors: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : '',
        message: err.msg,
      })),
    });
    return;
  }
  next();
};
