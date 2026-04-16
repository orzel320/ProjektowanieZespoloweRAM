import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

//TODO:
//zastapic operacje na plikach, operacjami na bazie danych 

@Injectable()
export class AuthService {
  private readonly usersPath = path.join(process.cwd(), 'data', 'users.json');

  private async readUsers(): Promise<any[]> {
    try {
      const data = await fs.readFile(this.usersPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async writeUsers(users: any[]): Promise<void> {
    const dir = path.dirname(this.usersPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.usersPath, JSON.stringify(users, null, 2));
  }

  async register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    const users = await this.readUsers();
    
    // Check if username exists
    if (users.find(u => u.username === username)) {
      return { success: false, error: 'Username already exists' };
    }
    
    // Hash password (VERY IMPORTANT - never store plain text!)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Save user
    users.push({
      id: Date.now().toString(),
      username,
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString()
    });
    
    await this.writeUsers(users);
    return { success: true };
  }

  async login(username: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    const users = await this.readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return { success: false, error: 'Invalid password' };
    }
    
    // Don't send password hash back to client
    const { passwordHash, ...safeUser } = user;
    return { success: true, user: safeUser };
  }
}
