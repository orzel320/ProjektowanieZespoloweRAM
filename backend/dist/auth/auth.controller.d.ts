import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(body: {
        username: string;
        password: string;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
    login(body: {
        username: string;
        password: string;
    }, session: any): Promise<{
        success: boolean;
        user?: any;
        error?: string;
    }>;
    logout(session: any): Promise<{
        success: boolean;
    }>;
    getMe(session: any): Promise<{
        authenticated: boolean;
        user?: undefined;
    } | {
        authenticated: boolean;
        user: {
            id: any;
            username: any;
        };
    }>;
}
