// app.d.ts - SvelteKit 타입 확장

declare global {
  namespace App {
    interface Locals {
      user: {
        id: string;
        email: string;
        company: string;
        plan: string;
      } | null;
      sessionId: string;
      // API 인증 확장
      authMethod?: 'api_key' | 'jwt' | 'cookie';
      userId?: number;    // DB 숫자 ID
      keyId?: number | null;
      role?: 'user' | 'admin';
    }
  }
}

export {};
