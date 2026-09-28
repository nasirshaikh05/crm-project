import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, IsNull } from 'typeorm';
import { FormEntity } from './entities/form.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { LeadService } from '../lead/lead.service';
import { WorkflowStore } from '../lead/workflow-store.service';
import { randomUUID } from 'crypto';

@Injectable()
export class FormService {
  constructor(
    @InjectRepository(FormEntity)
    private readonly formRepo: Repository<FormEntity>,
    @InjectRepository(FormSubmissionEntity)
    private readonly submissionRepo: Repository<FormSubmissionEntity>,
    private readonly leadService: LeadService,
    private readonly workflowStore: WorkflowStore,
    private readonly jwtService: JwtService,
  ) {}

  async create(createFormDto: CreateFormDto, userId: string, workspaceId: string): Promise<FormEntity> {
    const form = this.formRepo.create({
      id: randomUUID(),
      title: createFormDto.title,
      description: createFormDto.description,
      fields: createFormDto.fields,
      design: createFormDto.design || {},
      isActive: createFormDto.isActive ?? true,
      purpose: createFormDto.purpose || 'generic',
      onSuccessTransition: createFormDto.onSuccessTransition || null,
      userId,
      workspaceId,
    });
    return this.formRepo.save(form);
  }

  async findAll(workspaceId: string): Promise<any[]> {
    const forms = await this.formRepo.find({
      where: [
        { workspaceId },
        { workspaceId: IsNull() },
      ],
      order: { createdAt: 'DESC' },
    });
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return forms.map(form => {
      const jwtToken = this.jwtService.sign({ formId: form.id }, { expiresIn: '365d' });
      return {
        ...form,
        link: `${baseUrl}/pwa/${jwtToken}`,
      };
    });
  }

  async findOneByToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (!payload || !payload.formId) {
        throw new BadRequestException('Invalid token payload: formId is missing.');
      }
      const form = await this.findOne(payload.formId);
      if (!form.isActive) {
        throw new NotFoundException(`Form with ID "${payload.formId}" is not active.`);
      }
      return {
        form,
        leadId: payload.leadId || null,
      };
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new BadRequestException('Invalid or expired form token.');
    }
  }

  async findOne(id: string, workspaceId?: string): Promise<FormEntity> {
    const where: any = { id };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }
    const form = await this.formRepo.findOne({ where });
    if (!form) {
      throw new NotFoundException(`Form with ID "${id}" not found`);
    }
    return form;
  }

  async update(id: string, updateFormDto: UpdateFormDto, workspaceId: string): Promise<FormEntity> {
    const form = await this.findOne(id, workspaceId);

    if (updateFormDto.title !== undefined) form.title = updateFormDto.title;
    if (updateFormDto.description !== undefined) form.description = updateFormDto.description;
    if (updateFormDto.fields !== undefined) form.fields = updateFormDto.fields;
    if (updateFormDto.design !== undefined) form.design = updateFormDto.design;
    if (updateFormDto.isActive !== undefined) form.isActive = updateFormDto.isActive;
    if (updateFormDto.purpose !== undefined) form.purpose = updateFormDto.purpose;
    if (updateFormDto.onSuccessTransition !== undefined) form.onSuccessTransition = updateFormDto.onSuccessTransition;

    return this.formRepo.save(form);
  }

  async remove(id: string, workspaceId: string): Promise<void> {
    const form = await this.findOne(id, workspaceId);
    await this.formRepo.remove(form);
  }

  async submit(formId: string, submitFormDto: SubmitFormDto): Promise<FormSubmissionEntity> {
    const form = await this.findOne(formId);
    if (!form.isActive) {
      throw new NotFoundException(`Form with ID "${formId}" is not active or available.`);
    }

    const { answers } = submitFormDto;
    let leadId = submitFormDto.leadId;

    // 1. Extract mapped fields
    let firstName = 'Form';
    let lastName = 'Submission';
    let email = 'unknown@example.com';
    let phoneNumber = 'unknown';
    let suburb: string | undefined;
    let state: string | undefined;
    let postcode: string | undefined;

    if (form.fields && Array.isArray(form.fields)) {
      for (const field of form.fields) {
        const value = answers[field.name];
        if (value !== undefined && field.mapTo) {
          if (field.mapTo === 'firstName' && value) firstName = String(value);
          else if (field.mapTo === 'lastName' && value) lastName = String(value);
          else if (field.mapTo === 'email' && value) email = String(value);
          else if (field.mapTo === 'phoneNumber' && value) phoneNumber = String(value);
          else if (field.mapTo === 'suburb' && value) suburb = String(value);
          else if (field.mapTo === 'state' && value) state = String(value);
          else if (field.mapTo === 'postcode' && value) postcode = String(value);
        }
      }
    }

    // 2. Perform side effects based on form purpose
    if (form.purpose === 'lead_creation') {
      const createDto = {
        firstName,
        lastName,
        email,
        phoneNumber,
        suburb,
        state,
        postcode,
        currentQueueId: form.onSuccessTransition?.queueId,
        currentStageId: form.onSuccessTransition?.stageId,
        currentStepId: form.onSuccessTransition?.stepId,
      };

      let lead;
      if (form.userId) {
        lead = await this.leadService.create(createDto, form.userId, form.workspaceId || '');
      } else {
        lead = await this.leadService.registerPublicLead(createDto, form.workspaceId || undefined);
      }
      leadId = lead.id;
    } else if (form.purpose === 'lead_update') {
      if (!leadId) {
        throw new NotFoundException('leadId is required to update an existing lead via this form');
      }

      // Check if lead exists
      const lead = await this.leadService.findOne(leadId, form.workspaceId || undefined, form.userId || undefined);

      let hasUpdates = false;
      if (form.fields && Array.isArray(form.fields)) {
        for (const field of form.fields) {
          const value = answers[field.name];
          if (value !== undefined && field.mapTo) {
            if (field.mapTo === 'firstName' && value) {
              lead.firstName = String(value);
              hasUpdates = true;
            } else if (field.mapTo === 'lastName' && value) {
              lead.lastName = String(value);
              hasUpdates = true;
            } else if (field.mapTo === 'email' && value) {
              lead.email = String(value);
              hasUpdates = true;
            } else if (field.mapTo === 'phoneNumber' && value) {
              lead.phoneNumber = String(value);
              hasUpdates = true;
            } else if (field.mapTo === 'suburb' && value) {
              lead.suburb = String(value);
              hasUpdates = true;
            } else if (field.mapTo === 'state' && value) {
              lead.state = String(value);
              hasUpdates = true;
            } else if (field.mapTo === 'postcode' && value) {
              lead.postcode = String(value);
              hasUpdates = true;
            }
          }
        }
      }

      if (hasUpdates) {
        lead.updatedAt = new Date();
        await this.workflowStore.leadRepo.save(lead);
      }

      // Apply transition if configured
      if (form.onSuccessTransition) {
        const { queueId, stageId, stepId } = form.onSuccessTransition;
        if (queueId || stageId || stepId) {
          await this.leadService.moveLead(leadId, queueId, stageId, stepId, form.userId || undefined, form.workspaceId || undefined);
        }
      }
    }

    // 3. Save Submission Record
    const submission = this.submissionRepo.create({
      id: randomUUID(),
      formId: form.id,
      leadId: leadId || null,
      answers,
    });

    return this.submissionRepo.save(submission);
  }
}
