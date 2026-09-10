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
}
