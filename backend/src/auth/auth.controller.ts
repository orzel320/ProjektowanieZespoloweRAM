import { Controller, Post, Body, Session, Get } from '@nestjs/common'; // aadded Get
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { username: string; password: string }) {
    return this.authService.register(body.username, body.password);
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }, @Session() session: any) {
    const result = await this.authService.login(body.username, body.password);
    
    if (result.success) {
      // Store user in session (server-side, automatically sends cookie)
      session.userId = result.user.id;
      session.username = result.user.username;
    }
    
    return result;
  }

  @Post('logout')
  async logout(@Session() session: any) {
    session.destroy();
    return { success: true };
  }

  @Get('me')
  async getMe(@Session() session: any) {
    if (!session.userId) {
      return { authenticated: false };
    }
    return { 
      authenticated: true, 
      user: { id: session.userId, username: session.username }
    };
  }
}
