declare module '../../backend/auth.js' {
  export function getValidToken(): string;
  export function clearAuthData(): void;
}