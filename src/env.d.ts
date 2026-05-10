/// <reference types="astro/client" />

interface Env {
  DB: D1Database;
  EMAIL: SendEmail;
  SEED_KEY?: string;
  QA_MODE?: string;
  QA_USER_ID?: string;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
    };
    user: import('./db/schema').User | null;
    session: import('./db/schema').Session | null;
    qaUserId?: string;
  }
}
