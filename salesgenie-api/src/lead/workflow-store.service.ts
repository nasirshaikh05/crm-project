import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Queue } from '../queue/entities/queue.entity';
import { Stage } from '../stage/entities/stage.entity';
import { Step, StepActionType } from '../step/entities/step.entity';
import { StepActionContent } from '../step/entities/step-action-content.entity';
import { StepButton } from '../step/entities/step-button.entity';
import { StepButtonTransition, TransitionTargetType } from '../step/entities/step-button-transition.entity';
import { Lead } from './entities/lead.entity';
import { Customer } from './entities/customer.entity';
import { ContactTransitionLog } from './entities/contact-transition-log.entity';
import { StepActionExecution } from './entities/step-action-execution.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class WorkflowStore {
  private readonly logger = new Logger(WorkflowStore.name);

  constructor(
    @InjectRepository(Queue)
    public readonly queueRepo: Repository<Queue>,
    @InjectRepository(Stage)
    public readonly stageRepo: Repository<Stage>,
    @InjectRepository(Step)
    public readonly stepRepo: Repository<Step>,
    @InjectRepository(StepActionContent)
    public readonly stepActionContentRepo: Repository<StepActionContent>,
    @InjectRepository(StepButton)
    public readonly stepButtonRepo: Repository<StepButton>,
    @InjectRepository(StepButtonTransition)
    public readonly stepButtonTransitionRepo: Repository<StepButtonTransition>,
    @InjectRepository(Lead)
    public readonly leadRepo: Repository<Lead>,
    @InjectRepository(Customer)
    public readonly customerRepo: Repository<Customer>,
    @InjectRepository(ContactTransitionLog)
    public readonly transitionLogRepo: Repository<ContactTransitionLog>,
    @InjectRepository(StepActionExecution)
    public readonly actionExecutionRepo: Repository<StepActionExecution>,
  ) {}

  // --- Seed Helper ---
  public async seedDefaultWorkflow(userId?: string): Promise<void> {
    this.logger.log('Resetting workflow data in PostgreSQL (clearing all tables)...');

    // Clear existing configurations in dependency order using query builder to bypass empty criteria checks
    await this.stepButtonTransitionRepo.createQueryBuilder().delete().execute();
    await this.stepButtonRepo.createQueryBuilder().delete().execute();
    await this.stepActionContentRepo.createQueryBuilder().delete().execute();
    await this.stepRepo.createQueryBuilder().delete().execute();
    await this.stageRepo.createQueryBuilder().delete().execute();
    await this.queueRepo.createQueryBuilder().delete().execute();
    await this.actionExecutionRepo.createQueryBuilder().delete().execute();
    await this.transitionLogRepo.createQueryBuilder().delete().execute();
    await this.customerRepo.createQueryBuilder().delete().execute();
    await this.leadRepo.createQueryBuilder().delete().execute();

    this.logger.log('Successfully cleared database. Pre-existing workflows removed.');

    // Seed steps
    await this.seedDefaultData();
  }

  public async seedDefaultData(): Promise<void> {
    const stepsCount = await this.stepRepo.count();
    if (stepsCount > 0) {
      this.logger.log('Steps already exist in database. Skipping seeding.');
      return;
    }

    this.logger.log('Seeding 6 default template steps (without queues or stages)...');

    const defaultSteps = [
      {
        name: 'Welcome Email (with Buttons)',
        actionType: StepActionType.SEND_EMAIL_WITH_BUTTONS,
        subject: 'Welcome to our Service!',
        body: 'Hi, thank you for connecting with us. Click one of the options below to proceed.',
      },
      {
        name: 'Email with Product Brochure',
        actionType: StepActionType.SEND_EMAIL_WITH_ATTACHMENTS,
        subject: 'Here is your Product Brochure',
        body: 'Please find the attached brochure with details about our features, pricing, and services.',
      },
      {
        name: 'Product Walkthrough Video Email',
        actionType: StepActionType.SEND_EMAIL_WITH_VIDEO,
        subject: 'Watch our Product Walkthrough Video',
        body: 'Watch this quick video to see how our platform can help automate your workflow.',
      },
      {
        name: 'Schedule Booking Calendar Invite',
        actionType: StepActionType.SEND_CALENDAR_INVITE,
        subject: "Let's Schedule a Quick Call",
        body: 'Please book a slot on our calendar to discuss details: https://calendly.com/airnet-crm',
      },
      {
        name: 'Customer Feedback Form Email',
        actionType: StepActionType.SEND_EMAIL_WITH_FORM,
        subject: 'We Value Your Feedback',
        body: 'Please fill out this quick form to let us know how we can improve.',
      },
      {
        name: 'Onboarding Agreement Signature Request',
        actionType: StepActionType.SEND_AGREEMENT_FOR_SIGNATURE,
        subject: 'Your Onboarding Agreement',
        body: 'We have generated a customized agreement for you. Please click the button below to sign.',
      },
    ];

    let index = 0;
    for (const stepData of defaultSteps) {
      const stepId = randomUUID();
      const step = this.stepRepo.create({
        id: stepId,
        name: stepData.name,
        orderIndex: index++,
        actionType: stepData.actionType,
      });
      await this.stepRepo.save(step);

      const content = this.stepActionContentRepo.create({
        id: randomUUID(),
        stepId,
        subject: stepData.subject,
        body: stepData.body,
        metadata: {},
      });
      await this.stepActionContentRepo.save(content);

      if (stepData.actionType === StepActionType.SEND_EMAIL_WITH_BUTTONS) {
        const button1Id = randomUUID();
        const button1 = this.stepButtonRepo.create({
          id: button1Id,
          stepId,
          label: 'Interested',
          orderIndex: 0,
        });
        const button2Id = randomUUID();
        const button2 = this.stepButtonRepo.create({
          id: button2Id,
          stepId,
          label: 'Not Interested',
          orderIndex: 1,
        });
        await this.stepButtonRepo.save([button1, button2]);

        const trans1 = this.stepButtonTransitionRepo.create({
          id: randomUUID(),
          buttonId: button1Id,
          targetType: TransitionTargetType.DO_NOTHING,
        });
        const trans2 = this.stepButtonTransitionRepo.create({
          id: randomUUID(),
          buttonId: button2Id,
          targetType: TransitionTargetType.DO_NOTHING,
        });
        await this.stepButtonTransitionRepo.save([trans1, trans2]);
      } else if (stepData.actionType === StepActionType.SEND_AGREEMENT_FOR_SIGNATURE) {
        const buttonId = randomUUID();
        const button = this.stepButtonRepo.create({
          id: buttonId,
          stepId,
          label: 'Sign Contract',
          orderIndex: 0,
        });
        await this.stepButtonRepo.save(button);

        const trans = this.stepButtonTransitionRepo.create({
          id: randomUUID(),
          buttonId: buttonId,
          targetType: TransitionTargetType.CONVERT_TO_CUSTOMER,
        });
        await this.stepButtonTransitionRepo.save(trans);
      }
    }

    this.logger.log('Default steps seeded successfully.');
  }

  // --- Queue Queries ---
  public async getFirstActiveQueue(workspaceId?: string): Promise<Queue | null> {
    const whereClause: any = { isActive: true };
    if (workspaceId) whereClause.workspaceId = workspaceId;
    return this.queueRepo.findOne({ where: whereClause });
  }

  public async getQueue(id: string, workspaceId?: string): Promise<Queue | null> {
    const whereClause: any = { id };
    if (workspaceId) whereClause.workspaceId = workspaceId;
    return this.queueRepo.findOne({ where: whereClause });
  }

  public async getAllQueues(workspaceId?: string): Promise<Queue[]> {
    const whereClause: any = {};
    if (workspaceId) whereClause.workspaceId = workspaceId;
    return this.queueRepo.find({ where: whereClause });
  }

  // --- Stage Queries ---
  public async getStagesForQueue(queueId: string, workspaceId?: string): Promise<Stage[]> {
    const whereClause: any = { queueId };
    if (workspaceId) whereClause.workspaceId = workspaceId;
    return this.stageRepo.find({
      where: whereClause,
      order: { orderIndex: 'ASC' },
    });
  }

  public async getFirstStageForQueue(queueId: string, workspaceId?: string): Promise<Stage | null> {
    const list = await this.getStagesForQueue(queueId, workspaceId);
    return list[0] || null;
  }

  public async getStage(id: string, workspaceId?: string): Promise<Stage | null> {
    const whereClause: any = { id };
    if (workspaceId) whereClause.workspaceId = workspaceId;
    return this.stageRepo.findOne({ where: whereClause });
  }

  public async getAllStages(workspaceId?: string): Promise<Stage[]> {
    const whereClause: any = {};
    if (workspaceId) whereClause.workspaceId = workspaceId;
    return this.stageRepo.find({ where: whereClause });
  }

  // --- Step Queries ---
  public async getFirstStep(): Promise<Step | null> {
    const list = await this.getAllSteps();
    return list[0] || null;
  }

  public async getStep(id: string): Promise<Step | null> {
    return this.stepRepo.findOne({ where: { id } });
  }

  public async getAllSteps(): Promise<Step[]> {
    return this.stepRepo.find({ order: { orderIndex: 'ASC' } });
  }

  public async getStepsForStage(stageId: string): Promise<Step[]> {
    return this.stepRepo.find({
      where: { stageId },
      order: { orderIndex: 'ASC' },
    });
  }

  public async getFirstStepForStage(stageId: string): Promise<Step | null> {
    const list = await this.getStepsForStage(stageId);
    return list[0] || null;
  }

  // --- Button & Content Queries ---
  public async getActionContent(stepId: string): Promise<StepActionContent | null> {
    return this.stepActionContentRepo.findOne({ where: { stepId } });
  }

  public async getButtonsForStep(stepId: string): Promise<StepButton[]> {
    return this.stepButtonRepo.find({
      where: { stepId },
      order: { orderIndex: 'ASC' },
    });
  }

  public async getButtonTransition(buttonId: string): Promise<StepButtonTransition | null> {
    return this.stepButtonTransitionRepo.findOne({ where: { buttonId } });
  }

  public async getButton(id: string): Promise<StepButton | null> {
    return this.stepButtonRepo.findOne({ where: { id } });
  }
}
