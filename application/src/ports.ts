export type Clock = {
  now(): Date;
};

export type IdGenerator = {
  next(): string;
};

export type ChangeNotifier = {
  notify(input: {
    projectId: string;
    resource: string;
    action: string;
  }): Promise<void>;
};

export type {
  LoginToken,
  Session,
  LoginTokenRepository,
  SessionRepository,
} from "@tripapp/domain";
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
