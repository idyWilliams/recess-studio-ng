export { ApiErrorCode, type ApiErrorBody } from './errors.js';
export {
  createGamingProfileSchema,
  registerUserSchema,
  updateGamingProfileSchema,
  USERNAME_REGEX,
  type AuthUserResponse,
  type CreateGamingProfileInput,
  type GamingProfile,
  type RegisterResponse,
  type RegisterUserInput,
  type UpdateGamingProfileInput,
  type UserAccount,
} from './identity.js';
export {
  type GameInviteNotification,
  type GameResultNotification,
  type NotificationProvider,
  type TurnNotification,
} from './notifications.js';
export { type PlayerPresence, type PlayerPresenceStatus } from './presence.js';
export { type GameStats, type PlayerStats } from './stats.js';
