import { Params } from 'nestjs-pino';

/**
 * Make Pino logger configuration parameters for LoggerModule.
 * Formats output with pino-pretty during development and structured JSON in production,
 * eliminating sensitive fields like authorization headers and password.
 *
 * @returns {Params} NestJS Pino logger configuration parameters.
 */
export const pinoConfig = (): Params => ({
  pinoHttp: {
    level: process.env.LOG_LEVEL || 'info',
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
      req(req: { id?: string | number; method?: string; url?: string }): Record<string, unknown> {
        return { id: req.id, method: req.method, url: req.url };
      },
    },
  },
});
