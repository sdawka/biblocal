/// <reference types="astro/client" />

interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
    };
    user: import('./db/schema').User | null;
    session: import('./db/schema').Session | null;
  }
}
