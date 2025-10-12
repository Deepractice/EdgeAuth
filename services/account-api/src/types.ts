export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  PLUNK_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  BASE_URL: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  emailVerified: boolean;
  emailVerifiedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
