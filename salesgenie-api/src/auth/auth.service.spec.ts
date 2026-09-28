import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { WorkflowStore } from '../lead/workflow-store.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Workspace } from '../workspace/entities/workspace.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userServiceMock: any;
  let jwtServiceMock: any;
  let workflowStoreMock: any;
  let workspaceRepoMock: any;

  beforeEach(async () => {
    userServiceMock = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    jwtServiceMock = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    workflowStoreMock = {
      seedDefaultData: jest.fn().mockResolvedValue(undefined),
    };

    workspaceRepoMock = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((workspace) => Promise.resolve(workspace)),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: userServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: WorkflowStore, useValue: workflowStoreMock },
        { provide: getRepositoryToken(Workspace), useValue: workspaceRepoMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should create a user and return the user details without passwordHash', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        workspace: 'test-workspace',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      userServiceMock.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        workspace: 'test-workspace',
      });

      expect(userServiceMock.create).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!',
        'test-workspace',
        undefined,
        undefined,
      );
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      userServiceMock.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const mockUser = {
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('correct_password', 10),
      };
      userServiceMock.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong_password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully and return tokens without MFA', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('correct_password', 10),
        workspace: 'test-workspace',
      };
      userServiceMock.findByEmail.mockResolvedValue(mockUser);
      
      const mockWorkspace = { id: 'workspace-uuid', name: 'test-workspace', userId: 'user-uuid' };
      workspaceRepoMock.find.mockResolvedValue([mockWorkspace]);

      jwtServiceMock.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'correct_password',
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.workspaceName).toBe('test-workspace');
    });
  });

  describe('signout', () => {
    it('should return successfully with logged out message', async () => {
      const result = await service.signout();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
