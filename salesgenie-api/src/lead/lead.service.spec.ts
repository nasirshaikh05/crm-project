import { Test, TestingModule } from '@nestjs/testing';
import { LeadService } from './lead.service';
import { WorkflowStore } from './workflow-store.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Lead } from './entities/lead.entity';
import { StepButton } from '../step/entities/step-button.entity';
import { StorageService } from '../storage/storage.service';

describe('LeadService', () => {
  let service: LeadService;
  let workflowStoreMock: any;
  let storageServiceMock: any;

  beforeEach(async () => {
    workflowStoreMock = {
      leadRepo: {
        findOne: jest.fn(),
      },
      customerRepo: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
      getButton: jest.fn(),
      actionExecutionRepo: {
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
      },
      getButtonTransition: jest.fn(),
    };

    storageServiceMock = {
      uploadFile: jest.fn().mockResolvedValue('https://example.com/uploaded-file.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadService,
        { provide: WorkflowStore, useValue: workflowStoreMock },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: NotificationService,
          useValue: { sendCustomNotification: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verifyAsync: jest.fn().mockResolvedValue({ formId: 'mock-form-id', leadId: 'mock-lead-id' }),
          },
        },
        {
          provide: StorageService,
          useValue: storageServiceMock,
        },
      ],
    }).compile();

    service = module.get<LeadService>(LeadService);
  });

  it('should throw BadRequestException if button click is a duplicate response', async () => {
    const leadId = 'lead-uuid';
    const buttonId = 'button-uuid';
    const stepId = 'step-uuid';

    // Mock Lead (currentStepId is different from the button's stepId)
    const mockLead = {
      id: leadId,
      status: 'active',
      currentStepId: 'different-step-uuid',
    } as Lead;

    const mockButton = {
      id: buttonId,
      stepId: stepId,
      label: 'Submit',
    } as StepButton;

    jest.spyOn(service, 'findOne').mockResolvedValue(mockLead);
    workflowStoreMock.getButton.mockResolvedValue(mockButton);
    workflowStoreMock.actionExecutionRepo.findOne.mockResolvedValue(null);

    await expect(service.clickButton(leadId, buttonId)).rejects.toThrow(
      new BadRequestException('This response has been already recorded , contact our team for any Issues')
    );
  });

  it('should throw BadRequestException if step execution is already marked as clicked', async () => {
    const leadId = 'lead-uuid';
    const buttonId = 'button-uuid';
    const stepId = 'step-uuid';

    // Mock Lead (on the same step, but execution already completed)
    const mockLead = {
      id: leadId,
      status: 'active',
      currentStepId: stepId,
    } as Lead;

    const mockButton = {
      id: buttonId,
      stepId: stepId,
      label: 'Submit',
    } as StepButton;

    const mockExecution = {
      id: 'exec-uuid',
      status: 'clicked',
    };

    jest.spyOn(service, 'findOne').mockResolvedValue(mockLead);
    workflowStoreMock.getButton.mockResolvedValue(mockButton);
    // Already clicked execution
    workflowStoreMock.actionExecutionRepo.findOne.mockResolvedValue(mockExecution);

    await expect(service.clickButton(leadId, buttonId)).rejects.toThrow(
      new BadRequestException('This response has been already recorded , contact our team for any Issues')
    );
  });

  describe('findAll', () => {
    let queryBuilderMock: any;

    beforeEach(() => {
      queryBuilderMock = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      workflowStoreMock.leadRepo.createQueryBuilder = jest.fn().mockReturnValue(queryBuilderMock);
    });

    it('should apply pagination parameters', async () => {
      await service.findAll('user-uuid', 'workspace-uuid', { page: 2, limit: 10 });

      expect(queryBuilderMock.skip).toHaveBeenCalledWith(10);
      expect(queryBuilderMock.take).toHaveBeenCalledWith(10);
      expect(queryBuilderMock.getMany).toHaveBeenCalled();
    });

    it('should apply search parameters for name, suburb, postcode, state', async () => {
      await service.findAll('user-uuid', 'workspace-uuid', { search: 'Sydney' });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('lead.state ILIKE'),
        expect.objectContaining({ search: '%Sydney%' })
      );
    });

    it('should apply sorting by custom date column and sortOrder', async () => {
      await service.findAll('user-uuid', 'workspace-uuid', { sortBy: 'date', sortOrder: 'ASC' });

      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('lead.date', 'ASC');
    });

    it('should apply date range filters', async () => {
      await service.findAll('user-uuid', 'workspace-uuid', { startDate: '2026-08-01', endDate: '2026-08-10' });

      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'lead.date >= :startDate',
        expect.objectContaining({ startDate: expect.any(Date) })
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        'lead.date <= :endDate',
        expect.objectContaining({ endDate: expect.any(Date) })
      );
    });

    it('should default to sorting by updatedAt DESC', async () => {
      await service.findAll('user-uuid', 'workspace-uuid');

      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('lead.updatedAt', 'DESC');
    });
  });

  describe('allocateLeads batch allocations', () => {
    it('should allocate multiple leads to different stages/queues in batch', async () => {
      const mockLead1 = { id: 'lead-1', currentQueueId: null, currentStageId: null, currentStepId: null };
      const mockLead2 = { id: 'lead-2', currentQueueId: null, currentStageId: null, currentStepId: null };

      jest.spyOn(service as any, 'findOne')
        .mockImplementation((id: string) => {
          if (id === 'lead-1') return Promise.resolve(mockLead1);
          if (id === 'lead-2') return Promise.resolve(mockLead2);
          return Promise.resolve(null);
        });

      const mockStage1 = { id: 'stage-1', queueId: 'queue-1' };
      const mockStage2 = { id: 'stage-2', queueId: 'queue-2' };

      workflowStoreMock.getStage = jest.fn().mockImplementation((id: string) => {
        if (id === 'stage-1') return Promise.resolve(mockStage1);
        if (id === 'stage-2') return Promise.resolve(mockStage2);
        return Promise.resolve(null);
      });

      workflowStoreMock.getQueue = jest.fn().mockImplementation((id: string) => {
        return Promise.resolve({ id });
      });

      const mockStep1 = { id: 'step-1' };
      const mockStep2 = { id: 'step-2' };
      workflowStoreMock.getFirstStepForStage = jest.fn().mockImplementation((id: string) => {
        if (id === 'stage-1') return Promise.resolve(mockStep1);
        if (id === 'stage-2') return Promise.resolve(mockStep2);
        return Promise.resolve(null);
      });

      workflowStoreMock.leadRepo.save = jest.fn().mockImplementation((lead) => Promise.resolve(lead));
      workflowStoreMock.transitionLogRepo = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockResolvedValue(null),
      };
      workflowStoreMock.actionExecutionRepo = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(service as any, 'executeAction').mockResolvedValue(null);

      const allocations = [
        { leadId: 'lead-1', queueId: 'queue-1', stageId: 'stage-1' },
        { leadId: 'lead-2', queueId: 'queue-2', stageId: 'stage-2' },
      ];

      const result = await service.allocateLeads(
        undefined,
        undefined,
        undefined,
        'user-uuid',
        undefined,
        'workspace-uuid',
        allocations,
      );

      expect(result).toHaveLength(2);
      expect(mockLead1.currentQueueId).toBe('queue-1');
      expect(mockLead1.currentStageId).toBe('stage-1');
      expect(mockLead1.currentStepId).toBe('step-1');
      
      expect(mockLead2.currentQueueId).toBe('queue-2');
      expect(mockLead2.currentStageId).toBe('stage-2');
      expect(mockLead2.currentStepId).toBe('step-2');
    });
  });

  describe('create', () => {
    it('should create an unallocated lead if queue, stage, and step are omitted', async () => {
      workflowStoreMock.leadRepo.create = jest.fn().mockImplementation((dto) => dto);
      workflowStoreMock.leadRepo.save = jest.fn().mockResolvedValue(null);

      const createLeadDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1234567890',
      };

      const result = await service.create(createLeadDto, 'user-uuid', 'workspace-uuid');

      expect(result.currentQueueId).toBeNull();
      expect(result.currentStageId).toBeNull();
      expect(result.currentStepId).toBeNull();
      expect(workflowStoreMock.leadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          currentQueueId: null,
          currentStageId: null,
          currentStepId: null,
        })
      );
    });

    it('should resolve starting positions if any of the coordinates are provided', async () => {
      workflowStoreMock.leadRepo.create = jest.fn().mockImplementation((dto) => dto);
      workflowStoreMock.leadRepo.save = jest.fn().mockResolvedValue(null);
      workflowStoreMock.transitionLogRepo = {
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockResolvedValue(null),
      };

      workflowStoreMock.getFirstActiveQueue = jest.fn().mockResolvedValue({ id: 'default-queue' });
      workflowStoreMock.getFirstStageForQueue = jest.fn().mockResolvedValue({ id: 'default-stage' });
      workflowStoreMock.getFirstStepForStage = jest.fn().mockResolvedValue({ id: 'default-step' });
      workflowStoreMock.getFirstStep = jest.fn().mockResolvedValue({ id: 'default-step' });

      workflowStoreMock.getQueue = jest.fn().mockResolvedValue({ id: 'default-queue', name: 'Default Queue' });
      workflowStoreMock.getStage = jest.fn().mockResolvedValue({ id: 'default-stage', name: 'Default Stage' });
      workflowStoreMock.getStep = jest.fn().mockResolvedValue({ id: 'default-step', name: 'Default Step' });
      
      jest.spyOn(service as any, 'executeAction').mockResolvedValue(null);

      const createLeadDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+1234567890',
        currentQueueId: 'default-queue',
      };

      const result = await service.create(createLeadDto, 'user-uuid', 'workspace-uuid');

      expect(result.currentQueueId).toBe('default-queue');
      expect(result.currentStageId).toBe('default-stage');
      expect(result.currentStepId).toBe('default-step');
    });
  });

  describe('executeAction', () => {
    it('should generate a JWT token and embed it in the email for SEND_EMAIL_WITH_FORM actions', async () => {
      const leadId = 'lead-uuid';
      const mockLead = {
        id: leadId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        status: 'active',
        currentStepId: 'step-form-uuid',
      } as Lead;

      workflowStoreMock.leadRepo.findOne = jest.fn().mockResolvedValue(mockLead);
      workflowStoreMock.getStep = jest.fn().mockResolvedValue({
        id: 'step-form-uuid',
        name: 'Feedback Form Step',
        actionType: 'send_email_with_form',
      });
      workflowStoreMock.getActionContent = jest.fn().mockResolvedValue({
        subject: 'Please submit feedback',
        body: 'Click here: {{formLink}}',
        metadata: { formId: 'form-uuid' },
      });
      workflowStoreMock.getButtonsForStep = jest.fn().mockResolvedValue([]);
      workflowStoreMock.actionExecutionRepo.create = jest.fn().mockImplementation((dto) => dto);
      workflowStoreMock.actionExecutionRepo.save = jest.fn().mockResolvedValue(null);

      const notificationService = service['notificationService'];

      await service.executeAction(leadId, 'user-uuid');

      expect(notificationService.sendCustomNotification).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'john@example.com' }),
        expect.objectContaining({ email: true }),
        'Please submit feedback',
        expect.stringContaining('/pwa/mock-jwt-token'),
        expect.any(String),
      );
    });
  });

  describe('findCustomers', () => {
    it('should query customerRepo using query builder with pagination, sorting, search, and date filters', async () => {
      const queryBuilderMock: any = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'customer-1' }]),
      };

      workflowStoreMock.customerRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
      };

      const result = await service.findCustomers('user-uuid', 'workspace-uuid', {
        status: 'active',
        search: 'George',
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'ASC',
        startDate: '2026-08-01',
        endDate: '2026-08-10',
      });

      expect(workflowStoreMock.customerRepo.createQueryBuilder).toHaveBeenCalledWith('customer');
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        '(customer.workspaceId = :workspaceId OR customer.workspaceId IS NULL)',
        { workspaceId: 'workspace-uuid' }
      );
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith('customer.status = :status', { status: 'active' });
      expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
        '(customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR CONCAT(customer.firstName, \' \', customer.lastName) ILIKE :search OR customer.email ILIKE :search OR customer.phone ILIKE :search)',
        { search: '%George%' }
      );
      expect(queryBuilderMock.orderBy).toHaveBeenCalledWith('customer.createdAt', 'ASC');
      expect(queryBuilderMock.skip).toHaveBeenCalledWith(10);
      expect(queryBuilderMock.take).toHaveBeenCalledWith(10);
      expect(result).toEqual([{ id: 'customer-1' }]);
    });
  });

  describe('addAttachment', () => {
    it('should upload a file and append it to the lead attachments array', async () => {
      const mockLead = {
        id: 'lead-uuid',
        firstName: 'John',
        lastName: 'Doe',
        attachments: [] as any[],
      } as Lead;

      workflowStoreMock.leadRepo.findOne = jest.fn().mockResolvedValue(mockLead);
      workflowStoreMock.leadRepo.save = jest.fn().mockImplementation((lead) => Promise.resolve(lead));

      const mockFile = {
        originalname: 'contract.pdf',
        size: 1024,
        buffer: Buffer.from('hello'),
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      const result = await service.addAttachment('lead-uuid', mockFile, 'workspace-uuid', 'user-uuid');

      expect(storageServiceMock.uploadFile).toHaveBeenCalledWith(mockFile, 'attachments');
      expect(workflowStoreMock.leadRepo.save).toHaveBeenCalled();
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0]).toEqual(
        expect.objectContaining({
          name: 'contract.pdf',
          url: 'https://example.com/uploaded-file.pdf',
          size: 1024,
        }),
      );
    });
  });

  describe('findCustomerById', () => {
    it('should find a customer by ID', async () => {
      const mockCustomer = { id: 'cust-uuid', firstName: 'Jane' };
      workflowStoreMock.customerRepo.findOne.mockResolvedValue(mockCustomer);

      const result = await service.findCustomerById('cust-uuid', 'workspace-uuid');
      expect(workflowStoreMock.customerRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cust-uuid', workspaceId: 'workspace-uuid' },
      });
      expect(result).toEqual(mockCustomer);
    });
  });

  describe('updateCustomer', () => {
    it('should update customer details', async () => {
      const mockCustomer = { id: 'cust-uuid', firstName: 'Jane', lastName: 'Doe', status: 'active' };
      workflowStoreMock.customerRepo.findOne.mockResolvedValue(mockCustomer);
      workflowStoreMock.customerRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.updateCustomer('cust-uuid', { firstName: 'JaneChanged', status: 'inactive' }, 'workspace-uuid');
      expect(result.firstName).toBe('JaneChanged');
      expect(result.status).toBe('inactive');
      expect(workflowStoreMock.customerRepo.save).toHaveBeenCalled();
    });
  });
});
