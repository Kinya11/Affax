declare module '@backend/auth' {
  export function getValidToken(): string;
  export function clearAuthData(): void;
}
