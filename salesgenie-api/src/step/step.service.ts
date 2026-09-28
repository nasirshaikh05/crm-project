import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Step } from './entities/step.entity';
import { StepActionContent } from './entities/step-action-content.entity';
import { StepButton } from './entities/step-button.entity';
import { StepButtonTransition } from './entities/step-button-transition.entity';
import { Stage } from '../stage/entities/stage.entity';
import { Queue } from '../queue/entities/queue.entity';
import { Lead } from '../lead/entities/lead.entity';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';
import { ConfigureTransitionDto } from './dto/configure-transition.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class StepService {
  constructor(
    @InjectRepository(Step)
    private readonly stepRepo: Repository<Step>,
    @InjectRepository(StepActionContent)
    private readonly stepActionContentRepo: Repository<StepActionContent>,
    @InjectRepository(StepButton)
    private readonly stepButtonRepo: Repository<StepButton>,
    @InjectRepository(StepButtonTransition)
    private readonly stepButtonTransitionRepo: Repository<StepButtonTransition>,
    @InjectRepository(Stage)
    private readonly stageRepo: Repository<Stage>,
    @InjectRepository(Queue)
    private readonly queueRepo: Repository<Queue>,
    @InjectRepository(Lead)
    private readonly leadRepo: Repository<Lead>,
  ) {}

  // --- Step CRUD ---

  async create(createStepDto: CreateStepDto): Promise<Step> {
    if (createStepDto.stageId) {
      const stageExists = await this.stageRepo.findOne({ where: { id: createStepDto.stageId } });
      if (!stageExists) {
        throw new NotFoundException(`Stage with ID "${createStepDto.stageId}" not found`);
      }
    }

    if (createStepDto.stageId) {
      await this.stepRepo.query(
        'UPDATE steps SET order_index = order_index + 1 WHERE stage_id = $1 AND order_index >= $2',
        [createStepDto.stageId, createStepDto.orderIndex],
      );
    } else {
      await this.stepRepo.query(
        'UPDATE steps SET order_index = order_index + 1 WHERE stage_id IS NULL AND order_index >= $1',
        [createStepDto.orderIndex],
      );
    }

    const stepId = randomUUID();
    const step = this.stepRepo.create({
      id: stepId,
      name: createStepDto.name,
      orderIndex: createStepDto.orderIndex,
      actionType: createStepDto.actionType,
      stageId: createStepDto.stageId ?? null,
    });

    const savedStep = await this.stepRepo.save(step);

    if (createStepDto.actionContent) {
      const content = this.stepActionContentRepo.create({
        id: randomUUID(),
        stepId,
        subject: createStepDto.actionContent.subject,
        body: createStepDto.actionContent.body,
        attachmentUrl: createStepDto.actionContent.attachmentUrl,
        videoUrl: createStepDto.actionContent.videoUrl,
        metadata: createStepDto.actionContent.metadata ?? {},
      });
      await this.stepActionContentRepo.save(content);
    }

    return savedStep;
  }

  async findOne(id: string): Promise<Step> {
    const step = await this.stepRepo.findOne({ where: { id } });
    if (!step) {
      throw new NotFoundException(`Step with ID "${id}" not found`);
    }
    return step;
  }

  async findOneWithConfig(id: string): Promise<any> {
    const step = await this.findOne(id);
    const actionContent = await this.stepActionContentRepo.findOne({ where: { stepId: id } });
    const buttons = await this.stepButtonRepo.find({
      where: { stepId: id },
      order: { orderIndex: 'ASC' },
    });

    // Without this, a button's configured target ("go to stage X") saved
    // correctly but had no way to be re-displayed after a refetch — the
    // frontend had nothing to read it back from and defaulted to "do
    // nothing" every time, even though the real transition kept working.
    // targetStageName/targetStageQueueId are resolved here (rather than
    // left for the frontend to look up) because the target stage can
    // belong to a different queue than the step's own — the frontend only
    // has that one queue's stages loaded, so it can't always resolve the
    // name itself, but the backend has no such restriction.
    const buttonsWithTransitions = await Promise.all(
      buttons.map(async (b) => {
        const transition = await this.stepButtonTransitionRepo.findOne({ where: { buttonId: b.id } });
        let targetStageName: string | null = null;
        let targetStageQueueId: string | null = null;
        if (transition?.targetStageId) {
          const targetStage = await this.stageRepo.findOne({ where: { id: transition.targetStageId } });
          if (targetStage) {
            targetStageName = targetStage.name;
            targetStageQueueId = targetStage.queueId;
          }
        }
        return {
          ...b,
          transition: transition
            ? {
                id: transition.id,
                buttonId: transition.buttonId,
                targetType: transition.targetType,
                targetStepId: transition.targetStepId ?? null,
                targetStageId: transition.targetStageId ?? null,
                targetQueueId: transition.targetQueueId ?? null,
                targetStageName,
                targetStageQueueId,
              }
            : null,
        };
      }),
    );

    return {
      ...step,
      actionContent: actionContent || null,
      buttons: buttonsWithTransitions,
    };
  }

  async findAll(): Promise<Step[]> {
    return this.stepRepo.find({ order: { orderIndex: 'ASC' } });
  }

  async update(id: string, updateStepDto: UpdateStepDto): Promise<Step> {
    const step = await this.findOne(id);

    const oldStageId = step.stageId;
    const newStageId = updateStepDto.stageId !== undefined ? updateStepDto.stageId : step.stageId;

    if (updateStepDto.stageId) {
      const stageExists = await this.stageRepo.findOne({ where: { id: updateStepDto.stageId } });
      if (!stageExists) {
        throw new NotFoundException(`Stage with ID "${updateStepDto.stageId}" not found`);
      }
    }

    if (updateStepDto.stageId !== undefined && updateStepDto.stageId !== oldStageId) {
      // 1. Close gaps in the old stage boundary
      if (oldStageId) {
        await this.stepRepo.query(
          'UPDATE steps SET order_index = order_index - 1 WHERE stage_id = $1 AND order_index > $2',
          [oldStageId, step.orderIndex],
        );
      } else {
        await this.stepRepo.query(
          'UPDATE steps SET order_index = order_index - 1 WHERE stage_id IS NULL AND order_index > $1',
          [step.orderIndex],
        );
      }

      // 2. Insert into the new stage boundary
      let targetIndex = updateStepDto.orderIndex;
      if (targetIndex === undefined) {
        const maxStep = await this.stepRepo.findOne({
          where: { stageId: newStageId ?? IsNull() },
          order: { orderIndex: 'DESC' },
        });
        targetIndex = maxStep ? maxStep.orderIndex + 1 : 0;
      } else {
        if (newStageId) {
          await this.stepRepo.query(
            'UPDATE steps SET order_index = order_index + 1 WHERE stage_id = $1 AND order_index >= $2',
            [newStageId, targetIndex],
          );
        } else {
          await this.stepRepo.query(
            'UPDATE steps SET order_index = order_index + 1 WHERE stage_id IS NULL AND order_index >= $1',
            [targetIndex],
          );
        }
      }

      step.orderIndex = targetIndex;
      step.stageId = newStageId ?? null;
    } else if (updateStepDto.orderIndex !== undefined && updateStepDto.orderIndex !== step.orderIndex) {
      const oldIndex = step.orderIndex;
      const newIndex = updateStepDto.orderIndex;
      const stageId = step.stageId;

      if (stageId) {
        if (newIndex > oldIndex) {
          await this.stepRepo.query(
            'UPDATE steps SET order_index = order_index - 1 WHERE stage_id = $1 AND order_index > $2 AND order_index <= $3',
            [stageId, oldIndex, newIndex],
          );
        } else {
          await this.stepRepo.query(
            'UPDATE steps SET order_index = order_index + 1 WHERE stage_id = $1 AND order_index >= $2 AND order_index < $3',
            [stageId, newIndex, oldIndex],
          );
        }
      } else {
        if (newIndex > oldIndex) {
          await this.stepRepo.query(
            'UPDATE steps SET order_index = order_index - 1 WHERE stage_id IS NULL AND order_index > $1 AND order_index <= $2',
            [oldIndex, newIndex],
          );
        } else {
          await this.stepRepo.query(
            'UPDATE steps SET order_index = order_index + 1 WHERE stage_id IS NULL AND order_index >= $1 AND order_index < $2',
            [newIndex, oldIndex],
          );
        }
      }
      step.orderIndex = newIndex;
    }

    Object.assign(step, {
      name: updateStepDto.name ?? step.name,
      actionType: updateStepDto.actionType ?? step.actionType,
    });

    const savedStep = await this.stepRepo.save(step);

    if (updateStepDto.actionContent) {
      let content = await this.stepActionContentRepo.findOne({ where: { stepId: id } });
      if (!content) {
        content = this.stepActionContentRepo.create({
          id: randomUUID(),
          stepId: id,
          metadata: {},
        });
      }
      Object.assign(content, {
        subject: updateStepDto.actionContent.subject ?? content.subject,
        body: updateStepDto.actionContent.body ?? content.body,
        attachmentUrl: updateStepDto.actionContent.attachmentUrl ?? content.attachmentUrl,
        videoUrl: updateStepDto.actionContent.videoUrl ?? content.videoUrl,
        metadata: updateStepDto.actionContent.metadata ?? content.metadata,
      });
      await this.stepActionContentRepo.save(content);
    }

    return savedStep;
  }

  async remove(id: string): Promise<void> {
    const step = await this.findOne(id);

    // Safeguard: Check if any active leads are currently at this step
    const activeLeadCount = await this.leadRepo.count({
      where: { currentStepId: id, status: 'active' },
    });

    if (activeLeadCount > 0) {
      throw new BadRequestException(
        `Cannot delete Step because there are ${activeLeadCount} active leads currently assigned to it.`,
      );
    }

    // Explicitly clean up step action content, buttons and transitions to prevent key violations
    await this.stepActionContentRepo.delete({ stepId: id });

    const buttons = await this.stepButtonRepo.find({ where: { stepId: id } });
    for (const button of buttons) {
      await this.stepButtonTransitionRepo.delete({ buttonId: button.id });
    }
    await this.stepButtonRepo.delete({ stepId: id });

    await this.stepRepo.delete(id);

    // Close gaps in indexes within the same stage/global boundary
    if (step.stageId) {
      await this.stepRepo.query(
        'UPDATE steps SET order_index = order_index - 1 WHERE stage_id = $1 AND order_index > $2',
        [step.stageId, step.orderIndex],
      );
    } else {
      await this.stepRepo.query(
        'UPDATE steps SET order_index = order_index - 1 WHERE stage_id IS NULL AND order_index > $1',
        [step.orderIndex],
      );
    }
  }

  // --- Button Management ---

  async addButton(stepId: string, createButtonDto: CreateButtonDto): Promise<StepButton> {
    await this.findOne(stepId);

    let orderIndex = createButtonDto.orderIndex;
    if (orderIndex === undefined) {
      const maxBtn = await this.stepButtonRepo.findOne({
        where: { stepId },
        order: { orderIndex: 'DESC' },
      });
      orderIndex = maxBtn ? maxBtn.orderIndex + 1 : 1;
    }

    const button = this.stepButtonRepo.create({
      id: randomUUID(),
      stepId,
      label: createButtonDto.label,
      orderIndex,
    });

    return this.stepButtonRepo.save(button);
  }

  async updateButton(buttonId: string, updateButtonDto: UpdateButtonDto): Promise<StepButton> {
    const button = await this.stepButtonRepo.findOne({ where: { id: buttonId } });
    if (!button) {
      throw new NotFoundException(`Button with ID "${buttonId}" not found`);
    }

    Object.assign(button, updateButtonDto);
    return this.stepButtonRepo.save(button);
  }

  async removeButton(buttonId: string): Promise<void> {
    const button = await this.stepButtonRepo.findOne({ where: { id: buttonId } });
    if (!button) {
      throw new NotFoundException(`Button with ID "${buttonId}" not found`);
    }

    await this.stepButtonTransitionRepo.delete({ buttonId });
    await this.stepButtonRepo.delete(buttonId);
  }

  // --- Transition Binding ---

  async configureTransition(
    buttonId: string,
    configureTransitionDto: ConfigureTransitionDto,
  ): Promise<StepButtonTransition> {
    const button = await this.stepButtonRepo.findOne({ where: { id: buttonId } });
    if (!button) {
      throw new NotFoundException(`Button with ID "${buttonId}" not found`);
    }

    // Target checks
    if (configureTransitionDto.targetStepId) {
      const stepExists = await this.stepRepo.findOne({ where: { id: configureTransitionDto.targetStepId } });
      if (!stepExists) {
        throw new BadRequestException(`Target Step "${configureTransitionDto.targetStepId}" does not exist`);
      }
    }
    if (configureTransitionDto.targetStageId) {
      const stageExists = await this.stageRepo.findOne({ where: { id: configureTransitionDto.targetStageId } });
      if (!stageExists) {
        throw new BadRequestException(`Target Stage "${configureTransitionDto.targetStageId}" does not exist`);
      }
    }
    if (configureTransitionDto.targetQueueId) {
      const queueExists = await this.queueRepo.findOne({ where: { id: configureTransitionDto.targetQueueId } });
      if (!queueExists) {
        throw new BadRequestException(`Target Queue "${configureTransitionDto.targetQueueId}" does not exist`);
      }
    }

    let transition = await this.stepButtonTransitionRepo.findOne({ where: { buttonId } });
    if (!transition) {
      transition = this.stepButtonTransitionRepo.create({
        id: randomUUID(),
        buttonId,
      });
    }

    Object.assign(transition, configureTransitionDto);
    return this.stepButtonTransitionRepo.save(transition);
  }
}
