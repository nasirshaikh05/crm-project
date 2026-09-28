import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(
    email: string,
    passwordPlain: string,
    workspace?: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const user = this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      workspace: workspace || null,
      firstName: firstName || null,
      lastName: lastName || null,
    });

    return this.userRepo.save(user);
  }

  async update(id: string, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateDto.email) {
      const normalizedEmail = updateDto.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await this.findByEmail(normalizedEmail);
        if (existing) {
          throw new ConflictException('A user with this email already exists');
        }
        user.email = normalizedEmail;
      }
    }

    if (updateDto.firstName !== undefined) {
      user.firstName = updateDto.firstName || null;
    }
    if (updateDto.lastName !== undefined) {
      user.lastName = updateDto.lastName || null;
    }

    if (updateDto.password) {
      user.passwordHash = await bcrypt.hash(updateDto.password, 10);
    }

    return this.userRepo.save(user);
  }
}
