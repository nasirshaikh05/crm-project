import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from './entities/workspace.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { randomUUID } from 'crypto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    private readonly storageService: StorageService,
  ) {}

  async uploadLogo(id: string, file: Express.Multer.File, userId: string): Promise<Workspace> {
    const workspace = await this.findOne(id, userId);
    const logoUrl = await this.storageService.uploadFile(file, 'logos');
    workspace.logoUrl = logoUrl;
    return this.workspaceRepo.save(workspace);
  }

  async create(createWorkspaceDto: CreateWorkspaceDto, userId: string): Promise<Workspace> {
    const workspace = this.workspaceRepo.create({
      id: randomUUID(),
      name: createWorkspaceDto.name,
      orgName: createWorkspaceDto.orgName,
      logoUrl: createWorkspaceDto.logoUrl,
      userId,
    });
    return this.workspaceRepo.save(workspace);
  }

  async findAll(userId: string): Promise<Workspace[]> {
    return this.workspaceRepo.find({ where: { userId } });
  }

  async findOne(id: string, userId: string): Promise<Workspace> {
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) {
      throw new NotFoundException(`Workspace with ID "${id}" not found`);
    }
    if (workspace.userId !== userId) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return workspace;
  }

  async update(id: string, updateWorkspaceDto: UpdateWorkspaceDto, userId: string): Promise<Workspace> {
    const workspace = await this.findOne(id, userId);
    Object.assign(workspace, updateWorkspaceDto);
    return this.workspaceRepo.save(workspace);
  }

  async remove(id: string, userId: string): Promise<void> {
    const workspace = await this.findOne(id, userId);
    await this.workspaceRepo.remove(workspace);
  }
}
