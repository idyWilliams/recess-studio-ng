/** Domain notification payloads — no provider-specific fields. */

export interface GameInviteNotification {
  recipientUserId: string;
  sessionPublicId: string;
  gameName: string;
  inviterDisplayName: string;
}

export interface TurnNotification {
  recipientUserId: string;
  sessionPublicId: string;
  gameName: string;
}

export interface GameResultNotification {
  recipientUserId: string;
  sessionPublicId: string;
  gameName: string;
  outcomeSummary: string;
}

export interface NotificationProvider {
  sendGameInvite(input: GameInviteNotification): Promise<void>;
  sendTurnNotification(input: TurnNotification): Promise<void>;
  sendGameResult(input: GameResultNotification): Promise<void>;
}
