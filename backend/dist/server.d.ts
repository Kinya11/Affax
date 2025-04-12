declare global {
    namespace NodeJS {
        interface ProcessEnv {
            JWT_SECRET: string;
            GOOGLE_CLIENT_ID: string;
            DB_HOST: string;
            DB_USER: string;
            DB_PASSWORD?: string;
            DB_NAME: string;
            PORT?: string;
            NODE_ENV?: 'development' | 'production';
        }
    }
}
export {};
