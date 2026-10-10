import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { type ApiErrorBody } from '@recess/shared';

import { AppError } from './app-error.js';

export function registerErrorHandler(app: {
  setErrorHandler: (
    handler: (
      error: FastifyError | AppError,
      request: FastifyRequest,
      reply: FastifyReply,
    ) => void | Promise<void>,
  ) => void;
}): void {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      const body: ApiErrorBody = { code: error.code, message: error.message };
      void reply.status(error.statusCode).send(body);
      return;
    }

    void reply.status(500).send({ message: 'Internal server error' });
  });
}
