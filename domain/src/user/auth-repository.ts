export type LoginToken = {
  id: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type Session = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
};

export interface LoginTokenRepository {
  save(token: LoginToken): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<LoginToken | null>;
  consume(tokenHash: string, now: Date): Promise<LoginToken | null>;
}

export interface SessionRepository {
  save(session: Session): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}
