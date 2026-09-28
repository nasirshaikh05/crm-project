import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from './entities/queue.entity';
import { Lead } from '../lead/entities/lead.entity';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';

@Injectable()
export class QueueService {
  constructor(
    @InjectRepository(Queue)
    private readonly queueRepo: Repository<Queue>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  async create(createQueueDto: CreateQueueDto, userId: string, workspaceId: string): Promise<Queue> {
    const queue = this.queueRepo.create({ ...createQueueDto, userId, workspaceId });
    return this.queueRepo.save(queue);
  }

  async findAll(workspaceId: string): Promise<Queue[]> {
    return this.queueRepo.find({ where: { workspaceId } });
  }

  async findOne(id: string, workspaceId: string): Promise<Queue> {
    const queue = await this.queueRepo.findOne({ where: { id, workspaceId } });
    if (!queue) {
      throw new NotFoundException(`Queue with ID "${id}" not found`);
    }
    return queue;
  }

  async update(id: string, updateQueueDto: UpdateQueueDto, workspaceId: string): Promise<Queue> {
    const queue = await this.findOne(id, workspaceId);
    Object.assign(queue, updateQueueDto);
    return this.queueRepo.save(queue);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    await this.findOne(id, workspaceId);

    // Safeguard: Check if any active leads are currently inside this queue
    const activeLeadCount = await this.leadRepo.count({
      where: { currentQueueId: id, status: 'active', workspaceId },
    });

    if (activeLeadCount > 0) {
      throw new BadRequestException(
        `Cannot delete Queue because there are ${activeLeadCount} active leads currently assigned to it.`,
      );
    }

    await this.queueRepo.delete(id);
  }
}
