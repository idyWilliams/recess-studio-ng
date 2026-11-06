/**
 * Unified WhatsApp Outbound Messaging Gateway for Recess Studio.
 *
 * Implements multi-transport WhatsApp delivery:
 * - Transport A: Evolution API / WAHA / Baileys REST Gateway (WHATSAPP_API_URL + WHATSAPP_API_KEY)
 * - Transport B: Meta WhatsApp Cloud API (WHATSAPP_CLOUD_TOKEN + WHATSAPP_PHONE_ID)
 * - Transport C: Built-in Real-Time Push & In-App Notification Queue (Always active fallback)
 *
 * All operations are non-blocking and safe: failures in external WhatsApp gateways
 * will log warnings but will never abort server-authoritative game moves or sessions.
 */

import type { IdentityService, PlayerNotification } from '../identity/identity-service.js';

export interface WhatsAppNotificationPayload {
  toUserId: string;
  toPhone?: string | null | undefined;
  type: 'invite_accepted' | 'turn' | 'game_result' | 'challenge';
  title: string;
  message: string;
  matchUrl: string;
  gameTitle: string;
  fromUsername: string;
  fromUserId?: string | undefined;
  publicId?: string | undefined;
}

export interface WhatsAppGatewayConfig {
  apiUrl?: string | undefined;
  apiKey?: string | undefined;
  cloudToken?: string | undefined;
  phoneId?: string | undefined;
  webhookUrl?: string | undefined;
  appBaseUrl?: string | undefined;
}

export interface WhatsAppGatewayStatus {
  configured: boolean;
  transports: {
    evolutionOrWaha: boolean;
    metaCloud: boolean;
    webhook: boolean;
    inAppPush: boolean;
  };
  primaryTransport: 'evolution_waha' | 'meta_cloud' | 'webhook' | 'in_app_push';
  appBaseUrl: string;
}

export class WhatsAppGateway {
  private config: WhatsAppGatewayConfig;
  private identityService?: IdentityService | undefined;

  constructor(
    config: WhatsAppGatewayConfig = {},
    identityService?: IdentityService | undefined,
  ) {
    this.config = {
      apiUrl: config.apiUrl ?? process.env.WHATSAPP_API_URL,
      apiKey: config.apiKey ?? process.env.WHATSAPP_API_KEY,
      cloudToken: config.cloudToken ?? process.env.WHATSAPP_CLOUD_TOKEN,
      phoneId: config.phoneId ?? process.env.WHATSAPP_PHONE_ID,
      webhookUrl: config.webhookUrl ?? process.env.WHATSAPP_WEBHOOK_URL,
      appBaseUrl: config.appBaseUrl ?? process.env.APP_BASE_URL ?? 'https://recess.studio',
    };
    this.identityService = identityService;
  }

  setIdentityService(identityService: IdentityService): void {
    this.identityService = identityService;
  }

  getStatus(): WhatsAppGatewayStatus {
    const hasEvo = Boolean(this.config.apiUrl);
    const hasMeta = Boolean(this.config.cloudToken && this.config.phoneId);
    const hasWebhook = Boolean(this.config.webhookUrl);

    let primary: 'evolution_waha' | 'meta_cloud' | 'webhook' | 'in_app_push' = 'in_app_push';
    if (hasEvo) primary = 'evolution_waha';
    else if (hasMeta) primary = 'meta_cloud';
    else if (hasWebhook) primary = 'webhook';

    return {
      configured: hasEvo || hasMeta || hasWebhook,
      transports: {
        evolutionOrWaha: hasEvo,
        metaCloud: hasMeta,
        webhook: hasWebhook,
        inAppPush: true,
      },
      primaryTransport: primary,
      appBaseUrl: this.config.appBaseUrl ?? 'https://recess.studio',
    };
  }

  /**
   * Dispatch a notification to a player across all available channels.
   */
  async sendNotification(
    payload: WhatsAppNotificationPayload,
  ): Promise<{ delivered: boolean; transportsUsed: string[]; notificationId?: string | undefined }> {
    const transportsUsed: string[] = [];
    let delivered = false;

    // 1. Always write to target player's in-app notification inbox (Transport C)
    let notificationId: string | undefined;
    if (this.identityService) {
      try {
        const notif: PlayerNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: payload.type === 'invite_accepted' ? 'turn' : payload.type,
          challengerId: payload.fromUserId ?? 'system',
          challengerUsername: payload.fromUsername,
          targetPlayerId: payload.toUserId,
          targetUserId: payload.toUserId,
          gameType: payload.gameTitle.toLowerCase().replace(/\s+/g, '-'),
          gameName: payload.gameTitle,
          publicId: payload.publicId ?? '',
          matchUrl: payload.matchUrl,
          message: payload.message,
          createdAt: new Date().toISOString(),
          read: false,
        };
        this.identityService.createDirectNotification(notif);
        notificationId = notif.id;
        transportsUsed.push('in_app_push');
        delivered = true;
      } catch (err) {
        console.warn('[WhatsAppGateway] Failed to enqueue in-app notification:', err);
      }
    }

    // Resolve target phone number if not directly provided
    let targetPhone = payload.toPhone;
    if (!targetPhone && this.identityService) {
      targetPhone = await this.identityService.getUserPhoneNumber(payload.toUserId);
    }

    if (!targetPhone) {
      return { delivered, transportsUsed, notificationId };
    }

    const cleanPhone = targetPhone.replace(/[^\d+]/g, '');
    const fullMatchUrl = payload.matchUrl.startsWith('http')
      ? payload.matchUrl
      : `${this.config.appBaseUrl}${payload.matchUrl}`;

    const formattedWhatsAppText = `${payload.message}\n\n👉 Tap to play: ${fullMatchUrl}`;

    // 2. Transport A: Evolution / WAHA / Baileys REST Gateway
    if (this.config.apiUrl) {
      try {
        const url = this.config.apiUrl.replace(/\/+$/, '');
        const targetEndpoint = url.endsWith('/sendText')
          ? url
          : `${url}/message/sendText`;

        const response = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey ? { apikey: this.config.apiKey, Authorization: `Bearer ${this.config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            number: cleanPhone.replace(/^\+/, ''),
            text: formattedWhatsAppText,
          }),
          signal: AbortSignal.timeout(4000),
        });

        if (response.ok) {
          transportsUsed.push('evolution_waha');
          delivered = true;
        }
      } catch (err) {
        console.warn('[WhatsAppGateway] Transport A (Evolution/WAHA) failed:', err);
      }
    }

    // 3. Transport B: Meta WhatsApp Cloud API
    if (this.config.cloudToken && this.config.phoneId) {
      try {
        const metaUrl = `https://graph.facebook.com/v20.0/${this.config.phoneId}/messages`;
        const response = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.cloudToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhone.replace(/[^\d]/g, ''),
            type: 'text',
            text: {
              body: formattedWhatsAppText,
            },
          }),
          signal: AbortSignal.timeout(4000),
        });

        if (response.ok) {
          transportsUsed.push('meta_cloud');
          delivered = true;
        }
      } catch (err) {
        console.warn('[WhatsAppGateway] Transport B (Meta Cloud) failed:', err);
      }
    }

    // 4. Transport D: Webhook Relay (e.g. n8n, Make, or custom bot)
    if (this.config.webhookUrl) {
      try {
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: payload.type,
            to: cleanPhone,
            message: formattedWhatsAppText,
            gameTitle: payload.gameTitle,
            matchUrl: fullMatchUrl,
            fromUsername: payload.fromUsername,
          }),
          signal: AbortSignal.timeout(3000),
        });

        if (response.ok) {
          transportsUsed.push('webhook');
          delivered = true;
        }
      } catch (err) {
        console.warn('[WhatsAppGateway] Webhook transport failed:', err);
      }
    }

    return { delivered, transportsUsed, notificationId };
  }

  /**
   * Diagnostic test-send method for developers verifying WhatsApp connectivity.
   */
  async testSend(
    toPhone: string,
    message: string,
  ): Promise<{ success: boolean; details: string; transports: string[] }> {
    const res = await this.sendNotification({
      toUserId: 'test-user',
      toPhone,
      type: 'challenge',
      title: 'Recess Studio Test Ping',
      message: `🔔 ${message}`,
      matchUrl: '/games',
      gameTitle: 'Recess Studio',
      fromUsername: 'RecessSystem',
    });

    return {
      success: res.delivered,
      details: res.delivered
        ? `Delivered via: ${res.transportsUsed.join(', ')}`
        : 'Failed to deliver to configured transports. Ensure WHATSAPP_API_URL or WHATSAPP_CLOUD_TOKEN is valid.',
      transports: res.transportsUsed,
    };
  }
}
