import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error & { statusCode?: number; status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.statusCode ?? err.status ?? 500
  const message = err.message || 'Internal Server Error'

  if (status >= 500) {
    console.error('[ERROR]', err)
  }

  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : 'Request Error',
    message,
    statusCode: status,
  })
}
