import { AxiosResponse } from 'axios';
interface AuthResponse {
    token: string;
    user?: any;
    expires_in?: number;
}
declare const _default: {
    register(userData: any): Promise<AxiosResponse<AuthResponse>>;
    login(credentials: any): Promise<AxiosResponse<AuthResponse>>;
    googleLogin(idToken: string): Promise<AxiosResponse<AuthResponse>>;
    logout(): Promise<AxiosResponse>;
    getValidToken(): string | null;
    clearAuthData(): void;
};
export default _default;
