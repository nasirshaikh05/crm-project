import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage } from './entities/stage.entity';
import { Queue } from '../queue/entities/queue.entity';
import { Lead } from '../lead/entities/lead.entity';
import { Step } from '../step/entities/step.entity';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StageService {
  constructor(
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
    @InjectRepository(Queue)
    private readonly queueRepo: Repository<Queue>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
    @InjectRepository(Step)
    private readonly stepRepo: Repository<Step>,
  ) {}

  async create(createStageDto: CreateStageDto, userId: string, workspaceId: string): Promise<Stage> {
    const queueExists = await this.queueRepo.findOne({ where: { id: createStageDto.queueId, workspaceId } });
    if (!queueExists) {
      throw new BadRequestException(`Queue with ID "${createStageDto.queueId}" does not exist`);
    }

    // Shift existing stages with index >= target index
    await this.stageRepo.query(
      'UPDATE stages SET order_index = order_index + 1 WHERE queue_id = $1 AND workspace_id = $2 AND order_index >= $3',
      [createStageDto.queueId, workspaceId, createStageDto.orderIndex],
    );

    const { stepIds, ...stageFields } = createStageDto;
    const stage = this.stageRepo.create({ ...stageFields, userId, workspaceId });
    const savedStage = await this.stageRepo.save(stage);

    if (stepIds && stepIds.length > 0) {
      await this.assignStepsToStage(savedStage.id, stepIds);
    }

    return savedStage;
  }

  async findAll(workspaceId: string): Promise<Stage[]> {
    return this.stageRepo.find({ where: { workspaceId }, order: { orderIndex: 'ASC' } });
  }

  async findForQueue(queueId: string, workspaceId: string): Promise<Stage[]> {
    const queueExists = await this.queueRepo.findOne({ where: { id: queueId, workspaceId } });
    if (!queueExists) {
      throw new BadRequestException(`Queue with ID "${queueId}" does not exist`);
    }
    return this.stageRepo.find({
      where: { queueId, workspaceId },
      order: { orderIndex: 'ASC' },
    });
  }

  async findOne(id: string, workspaceId: string): Promise<Stage> {
    const stage = await this.stageRepo.findOne({ where: { id, workspaceId } });
    if (!stage) {
      throw new NotFoundException(`Stage with ID "${id}" not found`);
    }
    return stage;
  }

  async update(id: string, updateStageDto: UpdateStageDto, workspaceId: string): Promise<Stage> {
    const stage = await this.findOne(id, workspaceId);
    const oldIndex = stage.orderIndex;
    const newIndex = updateStageDto.orderIndex;

    if (newIndex !== undefined && newIndex !== oldIndex) {
      // Shift stage indexes to prevent unique index conflicts
      if (newIndex > oldIndex) {
        await this.stageRepo.query(
          'UPDATE stages SET order_index = order_index - 1 WHERE queue_id = $1 AND workspace_id = $2 AND order_index > $3 AND order_index <= $4',
          [stage.queueId, workspaceId, oldIndex, newIndex],
        );
      } else {
        await this.stageRepo.query(
          'UPDATE stages SET order_index = order_index + 1 WHERE queue_id = $1 AND workspace_id = $2 AND order_index >= $3 AND order_index < $4',
          [stage.queueId, workspaceId, newIndex, oldIndex],
        );
      }
    }

    const { stepIds, ...stageFields } = updateStageDto;
    Object.assign(stage, stageFields);
    const savedStage = await this.stageRepo.save(stage);

    if (stepIds !== undefined) {
      await this.assignStepsToStage(savedStage.id, stepIds);
    }

    return savedStage;
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const stage = await this.findOne(id, workspaceId);

    // Safeguard: Check if any active leads are currently inside this stage
    const activeLeadCount = await this.leadRepo.count({
      where: { currentStageId: id, status: 'active', workspaceId },
    });

    if (activeLeadCount > 0) {
      throw new BadRequestException(
        `Cannot delete Stage because there are ${activeLeadCount} active leads currently assigned to it.`,
      );
    }

    // Unassign steps belonging to this stage
    const steps = await this.stepRepo.find({ where: { stageId: id } });
    for (const step of steps) {
      step.stageId = null;
      await this.stepRepo.save(step);
    }

    await this.stageRepo.delete(id);

    // Close index gaps
    await this.stageRepo.query(
      'UPDATE stages SET order_index = order_index - 1 WHERE queue_id = $1 AND workspace_id = $2 AND order_index > $3',
      [stage.queueId, workspaceId, stage.orderIndex],
    );
  }

  private async assignStepsToStage(stageId: string, stepIds: string[]): Promise<void> {
    const existingSteps = await this.stepRepo.find({ where: { stageId } });
    for (const step of existingSteps) {
      if (!stepIds.includes(step.id)) {
        step.stageId = null;
        await this.stepRepo.save(step);
        await this.stepRepo.query(
          'UPDATE steps SET order_index = order_index - 1 WHERE stage_id = $1 AND order_index > $2',
          [stageId, step.orderIndex],
        );
      }
    }

    let index = 0;
    for (const stepId of stepIds) {
      const step = await this.stepRepo.findOne({ where: { id: stepId } });
      if (step) {
        if (step.stageId && step.stageId !== stageId) {
          await this.stepRepo.query(
            'UPDATE steps SET order_index = order_index - 1 WHERE stage_id = $1 AND order_index > $2',
            [step.stageId, step.orderIndex],
          );
        } else if (!step.stageId && step.orderIndex !== undefined) {
          await this.stepRepo.query(
            'UPDATE steps SET order_index = order_index - 1 WHERE stage_id IS NULL AND order_index > $1',
            [step.orderIndex],
          );
        }

        step.stageId = stageId;
        step.orderIndex = index++;
        await this.stepRepo.save(step);
      }
    }
  }
}
