import type { FastifyInstance } from 'fastify';
import type { WhatsAppGateway } from '../whatsapp/whatsapp-gateway.js';

export function registerWhatsAppRoutes(
  app: FastifyInstance,
  whatsappGateway: WhatsAppGateway,
): void {
  // GET /whatsapp/status — Check active transports and connectivity
  app.get('/whatsapp/status', async () => {
    return whatsappGateway.getStatus();
  });

  // POST /whatsapp/test-send — Diagnostic message send
  app.post<{ Body: { toPhone: string; message?: string } }>(
    '/whatsapp/test-send',
    async (request, reply) => {
      const { toPhone, message = 'Test ping from Recess Studio!' } = request.body ?? {};
      if (!toPhone) {
        return reply.status(400).send({
          ok: false,
          error: 'toPhone parameter is required (E.164 format, e.g. +234...)',
        });
      }

      const result = await whatsappGateway.testSend(toPhone, message);
      return reply.status(200).send(result);
    },
  );
}
