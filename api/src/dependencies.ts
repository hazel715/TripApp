import type { Persistence, SseBroker } from "@tripapp/infrastructure";
import type {
  EmailSender,
  Clock,
  IdGenerator,
  TokenHasher,
} from "@tripapp/application";
export type Dependencies = Omit<Persistence, "pool" | "close"> & {
  email: EmailSender;
  clock: Clock;
  ids: IdGenerator;
  hasher: TokenHasher;
  notifier: SseBroker;
  webOrigin: string;
  ttlMinutes: number;
  sessionTtlDays: number;
  production: boolean;
};
