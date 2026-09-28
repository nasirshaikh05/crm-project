import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreatePublicLeadDto } from './dto/create-public-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Lead } from './entities/lead.entity';
import { Customer } from './entities/customer.entity';
import { ContactTransitionLog } from './entities/contact-transition-log.entity';
import { StepActionExecution } from './entities/step-action-execution.entity';
import { LeadCreatedEvent } from './events/lead-created.event';
import { WorkflowStore } from './workflow-store.service';
import { NotificationService } from '../notification/notification.service';
import { StorageService } from '../storage/storage.service';
import { TransitionTargetType } from '../step/entities/step-button-transition.entity';
import { StepActionType } from '../step/entities/step.entity';
import { Between, LessThan, MoreThanOrEqual, IsNull, Not, In } from 'typeorm';
import { Stage } from '../stage/entities/stage.entity';
import { getButtonHtml, getAttachmentHtml, getVideoHtml } from './templates/email-element.template';

@Injectable()
export class LeadService {
  private readonly logger = new Logger(LeadService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly workflowStore: WorkflowStore,
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {}

  // --- Lead Management APIs ---

  async create(createLeadDto: CreateLeadDto, userId: string, workspaceId: string): Promise<Lead> {
    // 1. Resolve starting positions
    let queueId = createLeadDto.currentQueueId;
    let stageId = createLeadDto.currentStageId;
    let stepId = createLeadDto.currentStepId;

    if (queueId || stageId || stepId) {
      // Resolve stage and queue from step if step is provided
      if (stepId && (!stageId || !queueId)) {
        const step = await this.workflowStore.getStep(stepId);
        if (step && step.stageId) {
          stageId = stageId ?? step.stageId;
        }
      }

      // Resolve queue from stage if stage is provided
      if (stageId && !queueId) {
        const stage = await this.workflowStore.getStage(stageId, workspaceId);
        if (stage) {
          queueId = stage.queueId;
        }
      }

      // Default queue fallback
      if (!queueId) {
        const defaultQueue = await this.workflowStore.getFirstActiveQueue(workspaceId);
        if (!defaultQueue) {
          throw new BadRequestException('No active queues configured in the system. Please create a queue, stage, and step first.');
        }
        queueId = defaultQueue.id;
      }

      // Default stage fallback
      if (!stageId) {
        const defaultStage = await this.workflowStore.getFirstStageForQueue(queueId, workspaceId);
        if (!defaultStage) {
          throw new BadRequestException(`No stages configured for queue ID: ${queueId}`);
        }
        stageId = defaultStage.id;
      }

      // Default step fallback
      if (!stepId) {
        const defaultStep = (await this.workflowStore.getFirstStepForStage(stageId)) || (await this.workflowStore.getFirstStep());
        if (!defaultStep) {
          throw new BadRequestException('No steps configured in the system.');
        }
        stepId = defaultStep.id;
      }

      // Double check that the resolved components exist
      const q = await this.workflowStore.getQueue(queueId, workspaceId);
      const s = await this.workflowStore.getStage(stageId, workspaceId);
      const st = await this.workflowStore.getStep(stepId);
      if (!q || !s || !st) {
        throw new BadRequestException('Invalid queue, stage, or step IDs provided.');
      }
    }

    const finalQueueId = queueId || null;
    const finalStageId = stageId || null;
    const finalStepId = stepId || null;

    // 2. Create Lead
    const lead = this.workflowStore.leadRepo.create({
      id: randomUUID(),
      firstName: createLeadDto.firstName,
      lastName: createLeadDto.lastName,
      email: createLeadDto.email,
      phoneNumber: createLeadDto.phoneNumber,
      suburb: createLeadDto.suburb,
      postcode: createLeadDto.postcode,
      state: createLeadDto.state,
      date: createLeadDto.date ? new Date(createLeadDto.date) : new Date(),
      currentQueueId: finalQueueId,
      currentStageId: finalStageId,
      currentStepId: finalStepId,
      status: 'active',
      userId,
      workspaceId,
    });

    await this.workflowStore.leadRepo.save(lead);

    if (finalQueueId && finalStageId && finalStepId) {
      const q = await this.workflowStore.getQueue(finalQueueId, workspaceId);
      const s = await this.workflowStore.getStage(finalStageId, workspaceId);
      const st = await this.workflowStore.getStep(finalStepId);

      this.logger.log(`Created lead with ID: ${lead.id} at Queue: ${q?.name}, Stage: ${s?.name}, Step: ${st?.name}`);

      // 3. Log initial transition
      const transLog = this.workflowStore.transitionLogRepo.create({
        id: randomUUID(),
        leadId: lead.id,
        toQueueId: finalQueueId,
        toStageId: finalStageId,
        toStepId: finalStepId,
        triggeredBy: 'lead_creation',
        userId,
      });
      await this.workflowStore.transitionLogRepo.save(transLog);

      // 4. Dispatch initial execution asynchronously so it doesn't block lead return
      this.executeAction(lead.id, userId).catch((err) =>
        this.logger.error(`Failed to auto-execute action for new lead ${lead.id}: ${err.message}`),
      );
    } else {
      this.logger.log(`Created unallocated lead with ID: ${lead.id}`);
    }

    // Emit event with notification preferences (compatibility with standard listeners)
    const preferences = {
      email: createLeadDto.sendEmail ?? true,
      sms: createLeadDto.sendSms ?? true,
      whatsapp: createLeadDto.sendWhatsapp ?? true,
    };
    this.eventEmitter.emit(
      'lead.created',
      new LeadCreatedEvent(lead, preferences),
    );

    return lead;
  }

  async registerPublicLead(createPublicLeadDto: CreatePublicLeadDto, workspaceId?: string): Promise<Lead> {
    const lead = this.workflowStore.leadRepo.create({
      id: randomUUID(),
      firstName: createPublicLeadDto.firstName,
      lastName: createPublicLeadDto.lastName,
      email: createPublicLeadDto.email,
      phoneNumber: createPublicLeadDto.phoneNumber,
      suburb: createPublicLeadDto.suburb,
      postcode: createPublicLeadDto.postcode,
      state: createPublicLeadDto.state,
      date: createPublicLeadDto.date ? new Date(createPublicLeadDto.date) : new Date(),
      status: 'active',
      userId: null, // Public lead has no owner yet
      workspaceId: workspaceId || null,
    });

    await this.workflowStore.leadRepo.save(lead);
    this.logger.log(`Public lead registered via FormBuilder with ID: ${lead.id}`);
    return lead;
  }

  async findAll(
    userId: string,
    workspaceId: string,
    filters?: {
      status?: string;
      queueId?: string;
      stageId?: string;
      stepId?: string;
      allocation?: 'allocated' | 'unallocated' | 'all';
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      startDate?: string;
      endDate?: string;
    },
  ): Promise<Lead[]> {
    const query = this.workflowStore.leadRepo.createQueryBuilder('lead');

    // Return leads matching this workspace
    query.andWhere('(lead.workspaceId = :workspaceId OR lead.workspaceId IS NULL)', { workspaceId });

    if (filters?.status) {
      query.andWhere('lead.status = :status', { status: filters.status });
    }
    if (filters?.queueId) {
      query.andWhere('lead.currentQueueId = :queueId', { queueId: filters.queueId });
    }
    if (filters?.stageId) {
      query.andWhere('lead.currentStageId = :stageId', { stageId: filters.stageId });
    }
    if (filters?.stepId) {
      query.andWhere('lead.currentStepId = :stepId', { stepId: filters.stepId });
    }

    if (filters?.allocation === 'unallocated') {
      query.andWhere('lead.currentQueueId IS NULL');
    } else if (filters?.allocation === 'allocated') {
      query.andWhere('lead.currentQueueId IS NOT NULL');
    }

    // Search filter: Postcode, Suburb, and Lead Name
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      query.andWhere(
        '(lead.postcode ILIKE :search OR lead.suburb ILIKE :search OR lead.state ILIKE :search OR lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR CONCAT(lead.firstName, \' \', lead.lastName) ILIKE :search)',
        { search: searchPattern }
      );
    }

    // Date range filter w.r.t a stage/global
    if (filters?.startDate) {
      query.andWhere('lead.date >= :startDate', { startDate: new Date(filters.startDate) });
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('lead.date <= :endDate', { endDate: end });
    }

    // Sorting: default to sorting by updated_at DESC (latest first)
    const sortBy = filters?.sortBy === 'date' 
      ? 'lead.date' 
      : filters?.sortBy === 'createdAt' 
        ? 'lead.createdAt' 
        : 'lead.updatedAt';
    const sortOrder = filters?.sortOrder || 'DESC';
    query.orderBy(sortBy, sortOrder);

    // Pagination: default to 50
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    query.skip((page - 1) * limit);
    query.take(limit);

    return query.getMany();
  }

  async findOne(id: string, workspaceId?: string, userId?: string): Promise<Lead> {
    const whereClause: any = { id };
    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    } else if (userId) {
      whereClause.userId = userId;
    }
    const lead = await this.workflowStore.leadRepo.findOne({ where: whereClause });
    if (!lead) {
      throw new NotFoundException(`Lead with ID "${id}" not found`);
    }
    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, workspaceId?: string, userId?: string): Promise<Lead> {
    const lead = await this.findOne(id, workspaceId, userId);

    if (updateLeadDto.firstName !== undefined) lead.firstName = updateLeadDto.firstName;
    if (updateLeadDto.lastName !== undefined) lead.lastName = updateLeadDto.lastName;
    if (updateLeadDto.email !== undefined) lead.email = updateLeadDto.email;
    if (updateLeadDto.phoneNumber !== undefined) lead.phoneNumber = updateLeadDto.phoneNumber;
    if (updateLeadDto.suburb !== undefined) lead.suburb = updateLeadDto.suburb || null;
    if (updateLeadDto.postcode !== undefined) lead.postcode = updateLeadDto.postcode || null;
    if (updateLeadDto.state !== undefined) lead.state = updateLeadDto.state || null;
    if (updateLeadDto.status !== undefined) lead.status = updateLeadDto.status;
    if (updateLeadDto.currentQueueId !== undefined) lead.currentQueueId = updateLeadDto.currentQueueId || null;
    if (updateLeadDto.currentStageId !== undefined) lead.currentStageId = updateLeadDto.currentStageId || null;
    if (updateLeadDto.currentStepId !== undefined) lead.currentStepId = updateLeadDto.currentStepId || null;
    if (updateLeadDto.notes !== undefined) lead.notes = updateLeadDto.notes || null;
    if (updateLeadDto.attachments !== undefined) lead.attachments = updateLeadDto.attachments || null;

    lead.updatedAt = new Date();
    return this.workflowStore.leadRepo.save(lead);
  }

  async addAttachment(
    id: string,
    file: Express.Multer.File,
    workspaceId?: string,
    userId?: string,
  ): Promise<Lead> {
    const lead = await this.findOne(id, workspaceId, userId);

    const url = await this.storageService.uploadFile(file, 'attachments');

    const newAttachment = {
      name: file.originalname,
      url,
      size: file.size,
      uploadedAt: new Date(),
    };

    if (!lead.attachments || !Array.isArray(lead.attachments)) {
      lead.attachments = [];
    }
    lead.attachments.push(newAttachment);
    lead.updatedAt = new Date();

    return this.workflowStore.leadRepo.save(lead);
  }

  // --- Rich Lead Detail Endpoint ---

  async getLeadDetails(id: string, workspaceId?: string, userId?: string): Promise<any> {
    const lead = await this.findOne(id, workspaceId, userId);

    // Get workflow configuration details
    const queue = lead.currentQueueId ? await this.workflowStore.getQueue(lead.currentQueueId, workspaceId) : null;
    const stage = lead.currentStageId ? await this.workflowStore.getStage(lead.currentStageId, workspaceId) : null;
    const step = lead.currentStepId ? await this.workflowStore.getStep(lead.currentStepId) : null;

    const actionContent = step ? await this.workflowStore.getActionContent(step.id) : null;
    const buttons = step ? await this.workflowStore.getButtonsForStep(step.id) : [];

    const buttonsWithTransitions: any[] = [];
    for (const b of buttons) {
      const trans = await this.workflowStore.getButtonTransition(b.id);
      buttonsWithTransitions.push({
        id: b.id,
        label: b.label,
        orderIndex: b.orderIndex,
        transition: trans
          ? {
              id: trans.id,
              targetType: trans.targetType,
              targetStepId: trans.targetStepId,
              targetStageId: trans.targetStageId,
              targetQueueId: trans.targetQueueId,
            }
          : null,
      });
    }

    // Audit logs
    const transitions = await this.workflowStore.transitionLogRepo.find({ where: { leadId: id } });
    const executions = await this.workflowStore.actionExecutionRepo.find({ where: { leadId: id } });

    return {
      lead,
      workflow: {
        queue,
        stage,
        step,
        actionContent,
        buttons: buttonsWithTransitions,
      },
      transitions,
      executions,
    };
  }

  // --- Step Action Execution ---

  async executeAction(
    leadId: string,
    userId?: string,
    buttonIds?: string[],
    customRegards?: string,
  ): Promise<StepActionExecution> {
    const lead = await this.findOne(leadId, undefined, userId);
    if (lead.status !== 'active') {
      throw new BadRequestException(`Lead is in status '${lead.status}' and cannot execute steps.`);
    }

    if (!lead.currentStepId) {
      throw new BadRequestException('Lead is not placed at any active step.');
    }

    const step = await this.workflowStore.getStep(lead.currentStepId);
    if (!step) {
      throw new NotFoundException(`Step details for ID "${lead.currentStepId}" not found`);
    }

    const content = await this.workflowStore.getActionContent(step.id);

    // Resolve workspace details
    let workspaceName = 'Airnet Data Pty Ltd';
    if (lead.workspaceId && this.workflowStore.leadRepo.manager) {
      try {
        const workspace = await this.workflowStore.leadRepo.manager.getRepository('Workspace').findOne({
          where: { id: lead.workspaceId },
        });
        if (workspace) {
          workspaceName = workspace.orgName || workspace.name;
        }
      } catch (err) {
        this.logger.warn(`Failed to resolve workspace: ${err.message}`);
      }
    }

    // Dispatch notification
    const subject = content?.subject ?? `Update for Step: ${step.name}`;
    const body = content?.body ?? `Hi ${lead.firstName}, we have advanced your inquiry to step "${step.name}".`;

    let replacedBody = body;
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    if (step.actionType === StepActionType.SEND_EMAIL_WITH_FORM) {
      const formId = content?.metadata?.formId;
      if (formId) {
        const jwtToken = this.jwtService.sign({ formId, leadId: lead.id }, { expiresIn: '30d' });
        const formUrl = `${baseUrl}/pwa/${jwtToken}`;
        if (replacedBody.includes('{{formLink}}')) {
          replacedBody = replacedBody.replace(/\{\{formLink\}\}/g, formUrl);
        } else {
          replacedBody = replacedBody + '\n\n' + getButtonHtml(formUrl, 'Open Form');
        }
      }
    }

    // Prepare regards footer. The sign-off lives in the step's own
    // persisted content (metadata.regards, set from the step editor), so it
    // applies the same way whether this run was triggered automatically
    // (allocation, new lead, transitions) or via the manual send endpoint —
    // customRegards only exists as an explicit per-call override on top of
    // that. `body` itself no longer has a signature baked into it.
    const storedRegards =
      typeof content?.metadata?.regards === 'string' ? content.metadata.regards : undefined;
    const regards = customRegards !== undefined && customRegards !== null ? customRegards : storedRegards;
    let regardsFooter = '';
    if (regards && regards.trim()) {
      regardsFooter = '\n\n' + regards.trim();
    }

    // Fetch buttons and append HTML markup for interactive emails
    let buttons = await this.workflowStore.getButtonsForStep(step.id);
    if (buttonIds && buttonIds.length > 0) {
      buttons = buttons.filter(b => buttonIds.includes(b.id));
    }

    let htmlButtons = '';
    if (step.actionType === StepActionType.SEND_EMAIL_WITH_BUTTONS && buttons && buttons.length > 0) {
      htmlButtons = '\n\n' + buttons.map(b => {
        const url = `${baseUrl}/leads/${lead.id}/click-button-redirect?buttonId=${b.id}`;
        return getButtonHtml(url, b.label);
      }).join(' ');
    }

    let attachmentMarkup = '';
    if (step.actionType === StepActionType.SEND_EMAIL_WITH_ATTACHMENTS && content?.attachmentUrl) {
      attachmentMarkup = getAttachmentHtml(content.attachmentUrl);
    }

    let videoMarkup = '';
    if (step.actionType === StepActionType.SEND_EMAIL_WITH_VIDEO && content?.videoUrl) {
      videoMarkup = getVideoHtml(content.videoUrl);
    }

    // regardsFooter is appended at the very last in the email
    const fullBody = `${replacedBody}${htmlButtons}${attachmentMarkup}${videoMarkup}${regardsFooter}`;

    const channels = {
      email: [
        StepActionType.SEND_EMAIL_WITH_BUTTONS,
        StepActionType.SEND_EMAIL_WITH_ATTACHMENTS,
        StepActionType.SEND_EMAIL_WITH_VIDEO,
        StepActionType.SEND_EMAIL_WITH_FORM,
        StepActionType.SEND_CALENDAR_INVITE,
        StepActionType.SEND_AGREEMENT_FOR_SIGNATURE,
      ].includes(step.actionType),
      sms: step.actionType === StepActionType.SEND_SMS,
      whatsapp: false,
    };

    if (channels.email || channels.sms) {
      await this.notificationService.sendCustomNotification(
        { email: lead.email, phoneNumber: lead.phoneNumber },
        channels,
        subject,
        fullBody,
        workspaceName,
      );
    }

    // Record execution
    const execution = this.workflowStore.actionExecutionRepo.create({
      id: randomUUID(),
      leadId: lead.id,
      stepId: step.id,
      actionType: step.actionType,
      status: 'sent',
      executedAt: new Date(),
      userId: lead.userId || userId,
    });

    await this.workflowStore.actionExecutionRepo.save(execution);
    this.logger.log(`Executed action '${step.actionType}' for lead ${lead.id} at step ${step.id}`);

    // If step action type commands automatic movement, execute immediately
    if (step.actionType === StepActionType.GO_TO_NEXT_STEP) {
      await this.advanceNextStep(lead, 'system:auto_advance');
    } else if (step.actionType === StepActionType.GO_TO_NEXT_STAGE) {
      await this.advanceNextStage(lead, 'system:auto_advance');
    } else if (step.actionType === StepActionType.GO_TO_NEXT_QUEUE) {
      await this.advanceNextQueue(lead, 'system:auto_advance');
    } else if (step.actionType === StepActionType.CONVERT_TO_CUSTOMER) {
      await this.convertToCustomer(lead.id, undefined, lead.userId || userId);
    }

    return execution;
  }

  // --- Button Click Transition ---

  async clickButton(leadId: string, buttonId: string, userId?: string): Promise<Lead> {
    const lead = await this.findOne(leadId, undefined, userId);
    if (lead.status !== 'active') {
      throw new BadRequestException('Lead is not active and cannot transition.');
    }

    const button = await this.workflowStore.getButton(buttonId);
    if (!button) {
      throw new NotFoundException(`Button with ID "${buttonId}" not found`);
    }

    // Ensure button belongs to the lead's current step, or check if response was already recorded
    const executionClicked = await this.workflowStore.actionExecutionRepo.findOne({
      where: { leadId, stepId: button.stepId, status: 'clicked' },
    });
    if (lead.currentStepId !== button.stepId || executionClicked) {
      throw new BadRequestException('This response has been already recorded , contact our team for any Issues');
    }

    const transition = await this.workflowStore.getButtonTransition(buttonId);
    if (!transition) {
      throw new BadRequestException(`No transition configured for button "${button.label}"`);
    }

    // Update execution record to clicked
    const execs = await this.workflowStore.actionExecutionRepo.find({
      where: { leadId, stepId: lead.currentStepId },
    });
    for (const e of execs) {
      e.status = 'clicked';
      e.clickedButtonId = buttonId;
      await this.workflowStore.actionExecutionRepo.save(e);
    }

    const triggerDesc = `button_click:${button.label}`;

    // Execute transition target
    await this.applyTransitionTarget(lead, transition, triggerDesc, buttonId);

    return lead;
  }

  // --- Manual Movement API ---

  async moveLead(
    leadId: string,
    queueId?: string,
    stageId?: string,
    stepId?: string,
    userId?: string,
    workspaceId?: string,
  ): Promise<Lead> {
    const lead = await this.findOne(leadId, workspaceId, userId);

    const fromQueueId = lead.currentQueueId;
    const fromStageId = lead.currentStageId;
    const fromStepId = lead.currentStepId;

    // Resolve target queue/stage/step
    let targetQueueId = queueId ?? lead.currentQueueId;
    if (!targetQueueId) {
      const q = await this.workflowStore.getFirstActiveQueue(workspaceId);
      if (!q) throw new BadRequestException('No active queues found.');
      targetQueueId = q.id;
    }

    let targetStageId = stageId;
    if (!targetStageId) {
      if (targetQueueId !== lead.currentQueueId) {
        const s = await this.workflowStore.getFirstStageForQueue(targetQueueId, workspaceId);
        if (!s) throw new BadRequestException(`No stages in queue ${targetQueueId}`);
        targetStageId = s.id;
      } else {
        targetStageId = lead.currentStageId || undefined;
      }
    }

    if (!targetStageId) {
      throw new BadRequestException('Target stage must be resolved.');
    }

    let targetStepId = stepId;
    if (!targetStepId) {
      if (targetStageId !== lead.currentStageId) {
        const st = (await this.workflowStore.getFirstStepForStage(targetStageId)) || (await this.workflowStore.getFirstStep());
        if (!st) throw new BadRequestException('No steps configured in the system.');
        targetStepId = st.id;
      } else {
        targetStepId = lead.currentStepId || undefined;
      }
    }

    if (!targetStepId) {
      throw new BadRequestException('Target step must be resolved.');
    }

    // Validate existence of resolved values
    const q = await this.workflowStore.getQueue(targetQueueId, workspaceId);
    const s = await this.workflowStore.getStage(targetStageId, workspaceId);
    const st = await this.workflowStore.getStep(targetStepId);
    if (!q || !s || !st) {
      throw new BadRequestException('Resolved target queue, stage, or step does not exist.');
    }

    lead.currentQueueId = targetQueueId;
    lead.currentStageId = targetStageId;
    lead.currentStepId = targetStepId;
    lead.updatedAt = new Date();
    await this.workflowStore.leadRepo.save(lead);

    // Log Manual Transition
    const log = this.workflowStore.transitionLogRepo.create({
      id: randomUUID(),
      leadId: lead.id,
      fromQueueId,
      fromStageId,
      fromStepId,
      toQueueId: targetQueueId,
      toStageId: targetStageId,
      toStepId: targetStepId,
      triggeredBy: 'manual',
      userId: lead.userId || userId || undefined,
    });
    await this.workflowStore.transitionLogRepo.save(log);

    this.logger.log(`Lead ${lead.id} manually moved to Queue: ${q.name}, Stage: ${s.name}, Step: ${st.name}`);

    // Execute step action in background
    this.executeAction(lead.id, userId || lead.userId || undefined).catch((err) =>
      this.logger.error(`Failed to auto-execute action for manually moved lead ${lead.id}: ${err.message}`),
    );

    return lead;
  }

  // --- Lead to Customer Conversion ---

  async convertToCustomer(
    leadId: string,
    customFields?: { accountManagerId?: string; contractStartDate?: string },
    userId?: string,
    workspaceId?: string,
  ): Promise<Customer> {
    const lead = await this.findOne(leadId, workspaceId, userId);
    if (lead.status === 'converted') {
      throw new BadRequestException('Lead is already converted.');
    }

    // Create Customer
    const customer = this.workflowStore.customerRepo.create({
      id: randomUUID(),
      convertedFromLeadId: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phoneNumber,
      suburb: lead.suburb,
      state: lead.state,
      postcode: lead.postcode,
      currentQueueId: lead.currentQueueId,
      currentStageId: lead.currentStageId,
      currentStepId: lead.currentStepId,
      accountManagerId: customFields?.accountManagerId ?? randomUUID(),
      contractStartDate: customFields?.contractStartDate ?? new Date().toISOString().split('T')[0],
      status: 'active',
      userId: lead.userId || userId,
      workspaceId: lead.workspaceId || workspaceId || null,
    });
    await this.workflowStore.customerRepo.save(customer);

    // Update Lead
    lead.status = 'converted';
    lead.updatedAt = new Date();
    await this.workflowStore.leadRepo.save(lead);

    // Log conversions
    const leadLog = this.workflowStore.transitionLogRepo.create({
      id: randomUUID(),
      leadId: lead.id,
      fromQueueId: lead.currentQueueId,
      fromStageId: lead.currentStageId,
      fromStepId: lead.currentStepId,
      triggeredBy: 'convert_to_customer',
      userId: lead.userId || userId,
    });
    await this.workflowStore.transitionLogRepo.save(leadLog);

    const custLog = this.workflowStore.transitionLogRepo.create({
      id: randomUUID(),
      customerId: customer.id,
      toQueueId: lead.currentQueueId,
      toStageId: lead.currentStageId,
      toStepId: lead.currentStepId,
      triggeredBy: 'customer_creation',
      userId: lead.userId || userId,
    });
    await this.workflowStore.transitionLogRepo.save(custLog);

    this.logger.log(`Successfully converted lead ${lead.id} into customer ${customer.id}`);

    return customer;
  }

  async findCustomers(
    userId: string,
    workspaceId: string,
    filters?: {
      status?: string;
      queueId?: string;
      stageId?: string;
      stepId?: string;
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
      startDate?: string;
      endDate?: string;
    },
  ): Promise<Customer[]> {
    const query = this.workflowStore.customerRepo.createQueryBuilder('customer');

    // Return customers matching this workspace or global
    query.andWhere('(customer.workspaceId = :workspaceId OR customer.workspaceId IS NULL)', { workspaceId });

    if (filters?.status) {
      query.andWhere('customer.status = :status', { status: filters.status });
    }
    if (filters?.queueId) {
      query.andWhere('customer.currentQueueId = :queueId', { queueId: filters.queueId });
    }
    if (filters?.stageId) {
      query.andWhere('customer.currentStageId = :stageId', { stageId: filters.stageId });
    }
    if (filters?.stepId) {
      query.andWhere('customer.currentStepId = :stepId', { stepId: filters.stepId });
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      query.andWhere(
        '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR CONCAT(customer.firstName, \' \', customer.lastName) ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: searchPattern }
      );
    }

    if (filters?.startDate) {
      query.andWhere('customer.convertedAt >= :startDate', { startDate: new Date(filters.startDate) });
    }
    if (filters?.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.andWhere('customer.convertedAt <= :endDate', { endDate: end });
    }

    // Default sorting: newly converted customers should come first (convertedAt DESC)
    let sortBy = 'customer.convertedAt';
    if (filters?.sortBy === 'createdAt') {
      sortBy = 'customer.createdAt';
    } else if (filters?.sortBy === 'updatedAt') {
      sortBy = 'customer.updatedAt';
    } else if (filters?.sortBy === 'firstName') {
      sortBy = 'customer.firstName';
    } else if (filters?.sortBy === 'lastName') {
      sortBy = 'customer.lastName';
    } else if (filters?.sortBy === 'contractStartDate') {
      sortBy = 'customer.contractStartDate';
    }

    const sortOrder = filters?.sortOrder || 'DESC';
    query.orderBy(sortBy, sortOrder);

    // Pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    query.skip((page - 1) * limit);
    query.take(limit);

    return query.getMany();
  }

  async findCustomerById(id: string, workspaceId?: string, userId?: string): Promise<Customer> {
    const whereClause: any = { id };
    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    } else if (userId) {
      whereClause.userId = userId;
    }
    const customer = await this.workflowStore.customerRepo.findOne({ where: whereClause });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }
    return customer;
  }

  async updateCustomer(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    workspaceId?: string,
    userId?: string,
  ): Promise<Customer> {
    const customer = await this.findCustomerById(id, workspaceId, userId);

    if (updateCustomerDto.firstName !== undefined) customer.firstName = updateCustomerDto.firstName;
    if (updateCustomerDto.lastName !== undefined) customer.lastName = updateCustomerDto.lastName;
    if (updateCustomerDto.email !== undefined) customer.email = updateCustomerDto.email;
    if (updateCustomerDto.phone !== undefined) customer.phone = updateCustomerDto.phone;
    if (updateCustomerDto.suburb !== undefined) customer.suburb = updateCustomerDto.suburb;
    if (updateCustomerDto.state !== undefined) customer.state = updateCustomerDto.state;
    if (updateCustomerDto.postcode !== undefined) customer.postcode = updateCustomerDto.postcode;
    if (updateCustomerDto.status !== undefined) customer.status = updateCustomerDto.status;
    if (updateCustomerDto.currentQueueId !== undefined) customer.currentQueueId = updateCustomerDto.currentQueueId || null;
    if (updateCustomerDto.currentStageId !== undefined) customer.currentStageId = updateCustomerDto.currentStageId || null;
    if (updateCustomerDto.currentStepId !== undefined) customer.currentStepId = updateCustomerDto.currentStepId || null;
    if (updateCustomerDto.accountManagerId !== undefined) customer.accountManagerId = updateCustomerDto.accountManagerId || undefined;
    if (updateCustomerDto.contractStartDate !== undefined) customer.contractStartDate = updateCustomerDto.contractStartDate || undefined;

    customer.updatedAt = new Date();
    return this.workflowStore.customerRepo.save(customer);
  }

  // --- History & Audit Trail Getters ---

  async getTransitions(leadId: string, workspaceId?: string, userId?: string): Promise<ContactTransitionLog[]> {
    const lead = await this.findOne(leadId, workspaceId, userId);
    return this.workflowStore.transitionLogRepo.find({ where: { leadId } });
  }

  async getExecutions(leadId: string, workspaceId?: string, userId?: string): Promise<StepActionExecution[]> {
    const lead = await this.findOne(leadId, workspaceId, userId);
    return this.workflowStore.actionExecutionRepo.find({ where: { leadId } });
  }

  // --- Internal State Machine Helpers ---

  private async applyTransitionTarget(
    lead: Lead,
    trans: {
      targetType: TransitionTargetType;
      targetStepId?: string;
      targetStageId?: string;
      targetQueueId?: string;
    },
    trigger: string,
    buttonId?: string,
  ): Promise<void> {
    switch (trans.targetType) {
      case TransitionTargetType.NEXT_STEP:
        await this.advanceNextStep(lead, trigger, buttonId);
        break;
      case TransitionTargetType.NEXT_STAGE:
        await this.advanceNextStage(lead, trigger, buttonId);
        break;
      case TransitionTargetType.NEXT_QUEUE:
        await this.advanceNextQueue(lead, trigger, buttonId);
        break;
      case TransitionTargetType.SPECIFIC_STEP:
        if (!trans.targetStepId) throw new BadRequestException('Target step ID not configured for transition.');
        await this.moveToSpecificStep(lead, trans.targetStepId, trigger, buttonId);
        break;
      case TransitionTargetType.SPECIFIC_STAGE:
        if (!trans.targetStageId) throw new BadRequestException('Target stage ID not configured for transition.');
        await this.moveToSpecificStage(lead, trans.targetStageId, trigger, buttonId);
        break;
      case TransitionTargetType.SPECIFIC_QUEUE:
        if (!trans.targetQueueId) throw new BadRequestException('Target queue ID not configured for transition.');
        await this.moveToSpecificQueue(lead, trans.targetQueueId, trigger, buttonId);
        break;
      case TransitionTargetType.CONVERT_TO_CUSTOMER:
        await this.convertToCustomer(lead.id);
        break;
      case TransitionTargetType.DO_NOTHING:
      default:
        this.logger.log(`Transition target type 'do_nothing' for lead ${lead.id}`);
        break;
    }
  }

  private async advanceNextStep(lead: Lead, trigger: string, buttonId?: string): Promise<void> {
    if (!lead.currentStepId) return;

    const steps = lead.currentStageId
      ? await this.workflowStore.getStepsForStage(lead.currentStageId)
      : await this.workflowStore.getAllSteps();
    const currStep = await this.workflowStore.getStep(lead.currentStepId);
    if (!currStep) return;

    const nextStep = steps.find((s) => s.orderIndex > currStep.orderIndex);
    if (nextStep) {
      await this.moveToStep(lead, lead.currentQueueId || '', lead.currentStageId || '', nextStep.id, trigger, buttonId);
    } else {
      await this.advanceNextStage(lead, trigger, buttonId);
    }
  }

  private async advanceNextStage(lead: Lead, trigger: string, buttonId?: string): Promise<void> {
    if (!lead.currentQueueId || !lead.currentStageId) return;

    const stages = await this.workflowStore.getStagesForQueue(lead.currentQueueId);
    const currStage = await this.workflowStore.getStage(lead.currentStageId);
    if (!currStage) return;

    const nextStage = stages.find((s) => s.orderIndex > currStage.orderIndex);
    if (nextStage) {
      const firstStep = (await this.workflowStore.getFirstStepForStage(nextStage.id)) || (await this.workflowStore.getFirstStep());
      if (firstStep) {
        await this.moveToStep(lead, lead.currentQueueId, nextStage.id, firstStep.id, trigger, buttonId);
      } else {
        this.logger.warn(`No steps configured for stage: ${nextStage.name}`);
      }
    } else {
      await this.advanceNextQueue(lead, trigger, buttonId);
    }
  }

  private async advanceNextQueue(lead: Lead, trigger: string, buttonId?: string): Promise<void> {
    if (!lead.currentQueueId) return;

    const queues = await this.workflowStore.getAllQueues();
    const index = queues.findIndex((q) => q.id === lead.currentQueueId);
    if (index >= 0 && index < queues.length - 1) {
      const nextQueue = queues[index + 1];
      const nextStage = await this.workflowStore.getFirstStageForQueue(nextQueue.id);
      if (nextStage) {
        const nextStep = (await this.workflowStore.getFirstStepForStage(nextStage.id)) || (await this.workflowStore.getFirstStep());
        if (nextStep) {
          await this.moveToStep(lead, nextQueue.id, nextStage.id, nextStep.id, trigger, buttonId);
          return;
        }
      }
    }
    this.logger.log(`End of workflow pipelines reached for lead ${lead.id}`);
  }

  private async moveToSpecificStep(lead: Lead, targetStepId: string, trigger: string, buttonId?: string): Promise<void> {
    const step = await this.workflowStore.getStep(targetStepId);
    if (!step) throw new NotFoundException(`Specific step ${targetStepId} not found.`);

    await this.moveToStep(lead, lead.currentQueueId || '', lead.currentStageId || '', step.id, trigger, buttonId);
  }

  private async moveToSpecificStage(lead: Lead, targetStageId: string, trigger: string, buttonId?: string): Promise<void> {
    const stage = await this.workflowStore.getStage(targetStageId);
    if (!stage) throw new NotFoundException(`Specific stage ${targetStageId} not found.`);

    const firstStep = (await this.workflowStore.getFirstStepForStage(targetStageId)) || (await this.workflowStore.getFirstStep());
    if (!firstStep) throw new BadRequestException('No steps configured in the system.');

    await this.moveToStep(lead, stage.queueId, stage.id, firstStep.id, trigger, buttonId);
  }

  private async moveToSpecificQueue(lead: Lead, targetQueueId: string, trigger: string, buttonId?: string): Promise<void> {
    const queue = await this.workflowStore.getQueue(targetQueueId);
    if (!queue) throw new NotFoundException(`Specific queue ${targetQueueId} not found.`);

    const firstStage = await this.workflowStore.getFirstStageForQueue(targetQueueId);
    if (!firstStage) throw new BadRequestException(`No stages configured for queue ${queue.name}`);

    const firstStep = (await this.workflowStore.getFirstStepForStage(firstStage.id)) || (await this.workflowStore.getFirstStep());
    if (!firstStep) throw new BadRequestException('No steps configured in the system.');

    await this.moveToStep(lead, targetQueueId, firstStage.id, firstStep.id, trigger, buttonId);
  }

  private async moveToStep(
    lead: Lead,
    toQueueId: string,
    toStageId: string,
    toStepId: string,
    trigger: string,
    buttonId?: string,
  ): Promise<void> {
    const fromQueueId = lead.currentQueueId;
    const fromStageId = lead.currentStageId;
    const fromStepId = lead.currentStepId;

    lead.currentQueueId = toQueueId;
    lead.currentStageId = toStageId;
    lead.currentStepId = toStepId;
    lead.updatedAt = new Date();
    await this.workflowStore.leadRepo.save(lead);

    // Log transition
    const log = this.workflowStore.transitionLogRepo.create({
      id: randomUUID(),
      leadId: lead.id,
      fromQueueId,
      fromStageId,
      fromStepId,
      toQueueId,
      toStageId,
      toStepId,
      triggeredBy: trigger,
      buttonId,
      userId: lead.userId,
    });
    await this.workflowStore.transitionLogRepo.save(log);
    this.logger.log(`Transitioned Lead ${lead.id} to Queue: ${toQueueId}, Stage: ${toStageId}, Step: ${toStepId} via: ${trigger}`);

    // Automatically trigger action execution on landing
    this.executeAction(lead.id, lead.userId || undefined).catch((err) =>
      this.logger.error(`Failed to execute step action on landing for lead ${lead.id}: ${err.message}`),
    );
  }

  async getDashboardStats(
    workspaceId?: string,
    userId?: string,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<any> {
    const whereUser = workspaceId ? { workspaceId } : {};

    if (filters?.startDate) {
      const start = new Date(filters.startDate);
      const end = filters.endDate ? new Date(filters.endDate) : new Date();
      end.setHours(23, 59, 59, 999);

      const D = end.getTime() - start.getTime();
      const compareStart = new Date(start.getTime() - D);
      const compareEnd = start;

      const totalLeads = await this.workflowStore.leadRepo.count({
        where: { date: Between(start, end), ...whereUser }
      });

      const compareLeadsCount = await this.workflowStore.leadRepo.count({
        where: { date: Between(compareStart, compareEnd), ...whereUser }
      });

      const totalLeadsChange = compareLeadsCount > 0 
        ? Math.round(((totalLeads - compareLeadsCount) / compareLeadsCount) * 100) 
        : 0;
      const totalLeadsTrend = totalLeadsChange >= 0 ? 'up' : 'down';

      // New Leads: leads created in the latter part of the selected period (up to 7 days, bounded by range duration)
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const subPeriodDuration = Math.min(oneWeek, D);
      const newPeriodStart = new Date(end.getTime() - subPeriodDuration);
      const newPeriodEnd = end;

      const prevNewPeriodStart = new Date(newPeriodStart.getTime() - subPeriodDuration);
      const prevNewPeriodEnd = newPeriodStart;

      const newLeadsThisPeriod = await this.workflowStore.leadRepo.count({
        where: { date: Between(newPeriodStart, newPeriodEnd), ...whereUser }
      });
      const newLeadsPrevPeriod = await this.workflowStore.leadRepo.count({
        where: { date: Between(prevNewPeriodStart, prevNewPeriodEnd), ...whereUser }
      });

      const newLeadsPercentage = totalLeads > 0 
        ? Math.round((newLeadsThisPeriod / totalLeads) * 100) 
        : 0;
      const newLeadsChange = newLeadsPrevPeriod > 0
        ? Math.round(((newLeadsThisPeriod - newLeadsPrevPeriod) / newLeadsPrevPeriod) * 100)
        : 0;
      const newLeadsTrend = newLeadsChange >= 0 ? 'up' : 'down';

      // Conversion rate (converted leads count in range w.r.t totalLeads in range)
      const convertedLeadsCount = await this.workflowStore.leadRepo.count({
        where: { status: 'converted', updatedAt: Between(start, end), ...whereUser }
      });
      const avgConversionPercentage = totalLeads > 0 
        ? Math.round((convertedLeadsCount / totalLeads) * 100) 
        : 0;

      const convertedPrevPeriod = await this.workflowStore.leadRepo.count({
        where: { status: 'converted', updatedAt: Between(compareStart, compareEnd), ...whereUser }
      });
      const avgConversionChange = convertedPrevPeriod > 0
        ? Math.round(((convertedLeadsCount - convertedPrevPeriod) / convertedPrevPeriod) * 100)
        : 0;
      const avgConversionTrend = avgConversionChange >= 0 ? 'up' : 'down';

      // Customers created in range
      const dbCustomersCount = await this.workflowStore.customerRepo.count({
        where: { createdAt: Between(start, end), ...whereUser }
      });
      const targetConversionsCount = 10;
      const targetPercentage = targetConversionsCount > 0 
        ? Math.min(100, Math.round((dbCustomersCount / targetConversionsCount) * 100))
        : 0;

      // 5-point Graph Data
      const chartData: any[] = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const intervalDuration = D / 5;

      for (let i = 0; i < 5; i++) {
        const intervalStart = new Date(start.getTime() + i * intervalDuration);
        const intervalEnd = new Date(start.getTime() + (i + 1) * intervalDuration);

        const count = await this.workflowStore.leadRepo.count({
          where: {
            date: Between(intervalStart, intervalEnd),
            ...whereUser
          }
        });

        const compIntervalStart = new Date(intervalStart.getTime() - D);
        const compIntervalEnd = new Date(intervalEnd.getTime() - D);
        const comparisonCount = await this.workflowStore.leadRepo.count({
          where: {
            date: Between(compIntervalStart, compIntervalEnd),
            ...whereUser
          }
        });

        const dateStr = `${monthNames[intervalStart.getMonth()]} ${intervalStart.getDate()}`;
        chartData.push({
          date: dateStr,
          leads: count,
          comparison: comparisonCount,
        });
      }

      let workspaceName = 'Airnet Data Pty Ltd';
      let workspaceLogo = null;
      if (workspaceId) {
        const workspace = await this.workflowStore.leadRepo.manager.getRepository('Workspace').findOne({
          where: { id: workspaceId },
        });
        if (workspace) {
          workspaceName = workspace.orgName || workspace.name;
          workspaceLogo = workspace.logoUrl || null;
        }
      }

      return {
        totalLeads: {
          value: totalLeads,
          changePercentage: Math.abs(totalLeadsChange),
          trend: totalLeadsTrend,
        },
        newLeads: {
          value: newLeadsPercentage,
          changePercentage: Math.abs(newLeadsChange),
          trend: newLeadsTrend,
        },
        avgConversion: {
          value: avgConversionPercentage,
          changePercentage: Math.abs(avgConversionChange),
          trend: avgConversionTrend,
        },
        quarterlyTarget: {
          target: targetConversionsCount,
          current: dbCustomersCount,
          percentage: targetPercentage,
        },
        chartData,
        workspaceName,
        workspaceLogo,
      };
    }

    const totalLeads = await this.workflowStore.leadRepo.count({ where: whereUser });
    const dbCustomersCount = await this.workflowStore.customerRepo.count({ where: whereUser });

    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;

    // Leads created in the last 7 days
    const oneWeekAgo = new Date(now.getTime() - oneWeek);
    const leadsCreatedThisWeek = await this.workflowStore.leadRepo.count({
      where: { createdAt: MoreThanOrEqual(oneWeekAgo), ...whereUser }
    });

    // Leads created between 7 and 14 days ago
    const twoWeeksAgo = new Date(now.getTime() - 2 * oneWeek);
    const leadsCreatedLastWeek = await this.workflowStore.leadRepo.count({
      where: { createdAt: Between(twoWeeksAgo, oneWeekAgo), ...whereUser }
    });

    // Total leads change percentage since last week
    const leadsBeforeThisWeek = totalLeads - leadsCreatedThisWeek;
    const totalLeadsChange = leadsBeforeThisWeek > 0 
      ? Math.round((leadsCreatedThisWeek / leadsBeforeThisWeek) * 100) 
      : 0;
    const totalLeadsTrend = totalLeadsChange >= 0 ? 'up' : 'down';

    // New leads (created in the last 7 days) percentage of total leads
    const newLeadsPercentage = totalLeads > 0 
      ? Math.round((leadsCreatedThisWeek / totalLeads) * 100) 
      : 0;

    // New leads trend comparison: this week vs last week
    const newLeadsChange = leadsCreatedLastWeek > 0
      ? Math.round(((leadsCreatedThisWeek - leadsCreatedLastWeek) / leadsCreatedLastWeek) * 100)
      : 0;
    const newLeadsTrend = newLeadsChange >= 0 ? 'up' : 'down';

    // Conversion stats (leads with status = 'converted')
    const convertedLeadsCount = await this.workflowStore.leadRepo.count({
      where: { status: 'converted', ...whereUser }
    });
    const avgConversionPercentage = totalLeads > 0 
      ? Math.round((convertedLeadsCount / totalLeads) * 100) 
      : 0;

    // Converted leads trend comparison: this week vs last week
    const convertedThisWeek = await this.workflowStore.leadRepo.count({
      where: { status: 'converted', updatedAt: MoreThanOrEqual(oneWeekAgo), ...whereUser }
    });
    const convertedLastWeek = await this.workflowStore.leadRepo.count({
      where: { status: 'converted', updatedAt: Between(twoWeeksAgo, oneWeekAgo), ...whereUser }
    });
    const avgConversionChange = convertedLastWeek > 0
      ? Math.round(((convertedThisWeek - convertedLastWeek) / convertedLastWeek) * 100)
      : 0;
    const avgConversionTrend = avgConversionChange >= 0 ? 'up' : 'down';

    // Quarterly target (e.g. target number of converted customers, default to 10)
    const targetConversionsCount = 10;
    const targetPercentage = targetConversionsCount > 0 
      ? Math.min(100, Math.round((dbCustomersCount / targetConversionsCount) * 100))
      : 0;

    // Dynamic graph data: grouping actual leads by week for the last 5 weeks
    const chartData: any[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 4; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * oneWeek);
      const weekEnd = new Date(now.getTime() - i * oneWeek);

      const count = await this.workflowStore.leadRepo.count({
        where: {
          createdAt: Between(weekStart, weekEnd),
          ...whereUser
        }
      });

      const prevWeekStart = new Date(now.getTime() - (i + 2) * oneWeek);
      const comparisonCount = await this.workflowStore.leadRepo.count({
        where: {
          createdAt: Between(prevWeekStart, weekStart),
          ...whereUser
        }
      });

      const dateStr = `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()}`;
      chartData.push({
        date: dateStr,
        leads: count,
        comparison: comparisonCount,
      });
    }

    // Resolve Organization customizations
    let workspaceName = 'Airnet Data Pty Ltd';
    let workspaceLogo = null;
    if (workspaceId) {
      const workspace = await this.workflowStore.leadRepo.manager.getRepository('Workspace').findOne({
        where: { id: workspaceId },
      });
      if (workspace) {
        workspaceName = workspace.orgName || workspace.name;
        workspaceLogo = workspace.logoUrl || null;
      }
    }

    return {
      totalLeads: {
        value: totalLeads,
        changePercentage: Math.abs(totalLeadsChange),
        trend: totalLeadsTrend,
      },
      newLeads: {
        value: newLeadsPercentage,
        changePercentage: Math.abs(newLeadsChange),
        trend: newLeadsTrend,
      },
      avgConversion: {
        value: avgConversionPercentage,
        changePercentage: Math.abs(avgConversionChange),
        trend: avgConversionTrend,
      },
      quarterlyTarget: {
        target: targetConversionsCount,
        current: dbCustomersCount,
        percentage: targetPercentage,
      },
      chartData,
      workspaceName,
      workspaceLogo,
    };
  }

  async allocateLeads(
    queueId?: string,
    stageId?: string,
    count = 5,
    userId?: string,
    leadIds?: string[],
    workspaceId?: string,
    allocations?: { leadId: string; queueId?: string; stageId?: string }[],
  ): Promise<Lead[]> {
    const allocatedLeads: Lead[] = [];

    // 1. Process batch allocations if provided
    if (allocations && allocations.length > 0) {
      for (const item of allocations) {
        let targetQueueId = item.queueId;
        let targetStage: Stage | null = null;

        const lead = await this.findOne(item.leadId, workspaceId, userId);

        if (item.stageId) {
          targetStage = await this.workflowStore.getStage(item.stageId, workspaceId);
          if (!targetStage) {
            throw new NotFoundException(`Stage with ID "${item.stageId}" not found`);
          }
          targetQueueId = targetQueueId ?? targetStage.queueId;
          if (targetStage.queueId !== targetQueueId) {
            throw new BadRequestException(`Stage with ID "${item.stageId}" does not belong to Queue with ID "${targetQueueId}"`);
          }
        }

        if (!targetQueueId) {
          const activeQueue = await this.workflowStore.getFirstActiveQueue(workspaceId);
          if (!activeQueue) {
            throw new BadRequestException('No active queues found in the system.');
          }
          targetQueueId = activeQueue.id;
        }

        const q = await this.workflowStore.getQueue(targetQueueId, workspaceId);
        if (!q) {
          throw new NotFoundException(`Queue with ID "${targetQueueId}" not found`);
        }

        if (!targetStage) {
          const stage = await this.workflowStore.getFirstStageForQueue(targetQueueId, workspaceId);
          if (!stage) {
            throw new BadRequestException(`No stages configured for queue ID: ${targetQueueId}`);
          }
          targetStage = stage;
        }

        const step = (await this.workflowStore.getFirstStepForStage(targetStage.id)) || (await this.workflowStore.getFirstStep());
        if (!step) {
          throw new BadRequestException('No steps configured in the system.');
        }

        const fromQueueId = lead.currentQueueId;
        const fromStageId = lead.currentStageId;
        const fromStepId = lead.currentStepId;

        lead.currentQueueId = targetQueueId;
        lead.currentStageId = targetStage.id;
        lead.currentStepId = step.id;
        lead.updatedAt = new Date();

        // If the lead was a public form registration (no owner), assign it to the allocating user
        if (!lead.userId && userId) {
          lead.userId = userId;
        }

        await this.workflowStore.leadRepo.save(lead);

        // Log Transition History
        const log = this.workflowStore.transitionLogRepo.create({
          id: randomUUID(),
          leadId: lead.id,
          fromQueueId,
          fromStageId,
          fromStepId,
          toQueueId: targetQueueId,
          toStageId: targetStage.id,
          toStepId: step.id,
          triggeredBy: 'allocation',
          userId: userId || undefined,
        });
        await this.workflowStore.transitionLogRepo.save(log);

        // Automatically execute the welcome step action (sends email/buttons)
        this.executeAction(lead.id, userId || undefined).catch((err) =>
          this.logger.error(`Failed to auto-execute action for allocated lead ${lead.id}: ${err.message}`),
        );

        allocatedLeads.push(lead);
      }

      return allocatedLeads;
    }

    // 2. Fall back to old single-stage/queue allocation logic
    let targetQueueId = queueId;
    let targetStage: Stage | null = null;

    if (stageId) {
      targetStage = await this.workflowStore.getStage(stageId, workspaceId);
      if (!targetStage) {
        throw new NotFoundException(`Stage with ID "${stageId}" not found`);
      }
      targetQueueId = targetQueueId ?? targetStage.queueId;
      if (targetStage.queueId !== targetQueueId) {
        throw new BadRequestException(`Stage with ID "${stageId}" does not belong to Queue with ID "${targetQueueId}"`);
      }
    }

    if (!targetQueueId) {
      const activeQueue = await this.workflowStore.getFirstActiveQueue(workspaceId);
      if (!activeQueue) {
        throw new BadRequestException('No active queues found in the system.');
      }
      targetQueueId = activeQueue.id;
    }

    const q = await this.workflowStore.getQueue(targetQueueId, workspaceId);
    if (!q) {
      throw new NotFoundException(`Queue with ID "${targetQueueId}" not found`);
    }

    if (!targetStage) {
      const stage = await this.workflowStore.getFirstStageForQueue(targetQueueId, workspaceId);
      if (!stage) {
        throw new BadRequestException(`No stages configured for queue ID: ${targetQueueId}`);
      }
      targetStage = stage;
    }

    const step = (await this.workflowStore.getFirstStepForStage(targetStage.id)) || (await this.workflowStore.getFirstStep());
    if (!step) {
      throw new BadRequestException('No steps configured in the system.');
    }

    // Retrieve unallocated leads (where currentQueueId is null)
    let leadsToAllocate: Lead[] = [];
    const baseUnallocated: any = { currentQueueId: IsNull() };
    if (workspaceId) {
      baseUnallocated.workspaceId = workspaceId;
    }

    if (leadIds && leadIds.length > 0) {
      leadsToAllocate = await this.workflowStore.leadRepo.find({
        where: { id: In(leadIds), ...baseUnallocated },
      });
    } else {
      leadsToAllocate = await this.workflowStore.leadRepo.find({
        where: baseUnallocated,
        take: count,
        order: { createdAt: 'ASC' },
      });
    }

    for (const lead of leadsToAllocate) {
      const fromQueueId = lead.currentQueueId;
      const fromStageId = lead.currentStageId;
      const fromStepId = lead.currentStepId;

      lead.currentQueueId = targetQueueId;
      lead.currentStageId = targetStage.id;
      lead.currentStepId = step.id;
      lead.updatedAt = new Date();

      // If the lead was a public form registration (no owner), assign it to the allocating user
      if (!lead.userId && userId) {
        lead.userId = userId;
      }

      await this.workflowStore.leadRepo.save(lead);

      // Log Transition History
      const log = this.workflowStore.transitionLogRepo.create({
        id: randomUUID(),
        leadId: lead.id,
        fromQueueId,
        fromStageId,
        fromStepId,
        toQueueId: targetQueueId,
        toStageId: targetStage.id,
        toStepId: step.id,
        triggeredBy: 'allocation',
        userId: userId || undefined,
      });
      await this.workflowStore.transitionLogRepo.save(log);

      // Automatically execute the welcome step action (sends email/buttons)
      this.executeAction(lead.id, userId || undefined).catch((err) =>
        this.logger.error(`Failed to auto-execute action for allocated lead ${lead.id}: ${err.message}`),
      );

      allocatedLeads.push(lead);
    }

    return allocatedLeads;
  }
}
