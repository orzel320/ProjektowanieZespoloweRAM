import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async register(
    username: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    const exists = await this.usersRepository.exists({
      where: { username },
    });
    if (exists) {
      return { success: false, error: 'Username already exists' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.usersRepository.save(
      this.usersRepository.create({
        username,
        passwordHash: hashedPassword,
      }),
    );
    return { success: true };
  }

  async login(
    username: string,
    password: string,
  ): Promise<{
    success: boolean;
    user?: { id: string; username: string; createdAt: Date };
    error?: string;
  }> {
    const user = await this.usersRepository.findOne({ where: { username } });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return { success: false, error: 'Invalid password' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
    };
  }
}
