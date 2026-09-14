export class SettingsDto {
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
  wavoipToken?: string;
  /** Default lifetime of local read snapshots for this instance, in seconds. */
  localReadTtlSeconds?: number | null;
  /** Per-method snapshot lifetimes, keyed by Evolution or Baileys method name. */
  localReadTtlOverrides?: Record<string, number> | null;
  /** Per-instance outbound automation safeguards and user-experience pacing. */
  automationSafety?: AutomationSafetySettings | null;
}

export type AutomationSafetySettings = {
  enabled?: boolean;
  typing?: {
    enabled?: boolean;
    minMs?: number;
    maxMs?: number;
    charactersPerSecond?: number;
    jitterPercent?: number;
    presence?: 'composing' | 'recording';
    applyToMediaCaptions?: boolean;
  };
  rateLimit?: {
    instancePerMinute?: number;
    instancePerDay?: number;
    recipientPerMinute?: number;
    recipientPerDay?: number;
    minimumIntervalMs?: number;
    maxConcurrentSends?: number;
  };
  quietHours?: {
    enabled?: boolean;
    start?: string;
    end?: string;
    timeZone?: string;
  };
  duplicate?: {
    enabled?: boolean;
    windowSeconds?: number;
  };
  suppression?: {
    recipients?: string[];
    allowlistEnabled?: boolean;
    allowedRecipients?: string[];
  };
  failurePause?: {
    enabled?: boolean;
    threshold?: number;
    pauseSeconds?: number;
  };
  audit?: {
    retentionDays?: number;
  };
};
