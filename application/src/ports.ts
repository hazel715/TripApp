export type Clock = {
  now(): Date;
};

export type IdGenerator = {
  next(): string;
};

export type ChangeNotifier = {
  notify(input: { projectId: string; resource: string; action: string }): Promise<void>;
};

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
}

export interface SessionRepository {
  save(session: Session): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  deleteByTokenHash(tokenHash: string): Promise<void>;
}

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  loginUrl: string;
};

export interface EmailSender {
  sendLoginLink(message: EmailMessage): Promise<void>;
}

export type TokenHasher = {
  hash(raw: string): string;
  randomToken(): string;
};
