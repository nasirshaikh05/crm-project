import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { User } from '../user/entities/user.entity';
import { WorkflowStore } from '../lead/workflow-store.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../workspace/entities/workspace.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly workflowStore: WorkflowStore,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  async register(dto: RegisterDto): Promise<Omit<User, 'passwordHash'>> {
    await this.workflowStore.seedDefaultData();
    const user = await this.userService.create(
      dto.email,
      dto.password,
      dto.workspace,
      dto.firstName,
      dto.lastName,
    );

    // Automatically create a default workspace using the workspace name string provided
    const workspaceName = dto.workspace || 'Default Workspace';
    const workspace = this.workspaceRepo.create({
      id: randomUUID(),
      name: workspaceName,
      userId: user.id,
    });
    await this.workspaceRepo.save(workspace);

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const activeWorkspace = await this.getActiveWorkspace(user.id);
    const tokens = await this.generateTokens(user, activeWorkspace.id);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        workspaceId: activeWorkspace.id,
        workspaceName: activeWorkspace.name,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user, payload.workspaceId);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async switchWorkspace(userId: string, workspaceId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const workspace = await this.workspaceRepo.findOne({ where: { id: workspaceId, userId } });
    if (!workspace) {
      throw new UnauthorizedException('Workspace not found or access denied');
    }

    return this.generateTokens(user, workspaceId);
  }

  private async getActiveWorkspace(userId: string, activeWorkspaceId?: string): Promise<Workspace> {
    const workspaces = await this.workspaceRepo.find({ where: { userId } });
    if (workspaces.length === 0) {
      const defaultWorkspace = this.workspaceRepo.create({
        id: randomUUID(),
        name: 'Default Workspace',
        userId,
      });
      return this.workspaceRepo.save(defaultWorkspace);
    }

    if (activeWorkspaceId) {
      const selected = workspaces.find(w => w.id === activeWorkspaceId);
      if (selected) return selected;
    }

    return workspaces[0];
  }

  private async generateTokens(user: User, activeWorkspaceId?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const activeWorkspace = await this.getActiveWorkspace(user.id, activeWorkspaceId);
    const payload = {
      sub: user.id,
      email: user.email,
      workspaceId: activeWorkspace.id,
      workspaceName: activeWorkspace.name,
    };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync({ sub: user.id, workspaceId: activeWorkspace.id }, { expiresIn: '7d' }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async signout(): Promise<{ message: string }> {
    return { message: 'Logged out successfully' };
  }
}
