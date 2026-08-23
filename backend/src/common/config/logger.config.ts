import { type Params } from 'nestjs-pino';

/**
 * Pino logger configuration parameters generator for PinoLogger Module.
 * Development environment provides with pretty logging output while production provides structured JSON.
 * Sensitive fields are censored with [REDACTED] output in place.
 */
export const pinoConfig = (): Params => ({
  pinoHttp: {
    level:
      process.env.NODE_ENV !== 'production'
        ? 'debug'
        : process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.newPassword',
        'req.body.currentPassword',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
    customProps: (): Record<string, string> => ({ context: 'HTTP' }),
    autoLogging: true,
    serializers: {
      req(req: {
        id?: string | number;
        method?: string;
        url?: string;
      }): Record<string, unknown> {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split('?')[0],
        };
      },
    },
  },
});
