export declare class AuthService {
    private readonly usersPath;
    private readUsers;
    private writeUsers;
    register(username: string, password: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    login(username: string, password: string): Promise<{
        success: boolean;
        user?: any;
        error?: string;
    }>;
}
