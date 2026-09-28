import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../auth/decorators/public.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { CreatePublicLeadDto } from './dto/create-public-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Lead } from './entities/lead.entity';
import { LeadService } from './lead.service';
import { WorkflowStore } from './workflow-store.service';
import { StepActionExecution } from './entities/step-action-execution.entity';
import { Customer } from './entities/customer.entity';
import { ContactTransitionLog } from './entities/contact-transition-log.entity';
import { getRedirectHtml, getAlreadyRecordedHtml } from './templates/redirect.template';

@ApiBearerAuth()
@ApiTags('leads')
@Controller('leads')
export class LeadController {
  constructor(
    private readonly leadService: LeadService,
    private readonly workflowStore: WorkflowStore,
  ) {}

  // --- Workflow Management Endpoints ---

  @Post('workflow/seed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset database (Clear all queues, stages, steps, leads, and customer logs)' })
  @ApiResponse({ status: 200, description: 'Database cleared and reset successfully.' })
  async seedWorkflow(@Req() req: any) {
    const userId = req.user?.sub;
    await this.workflowStore.seedDefaultWorkflow(userId);
    const queues = await this.workflowStore.getAllQueues();
    const stages = await this.workflowStore.getAllStages();
    const steps = await this.workflowStore.getAllSteps();
    return {
      message: 'Database reset successfully. Ready for custom workflow configuration.',
      workflowSummary: {
        queues: queues.map((q) => ({ id: q.id, name: q.name })),
        stages: stages.map((s) => ({ id: s.id, name: s.name, queueId: s.queueId })),
        steps: steps.map((st) => ({ id: st.id, name: st.name, actionType: st.actionType })),
      },
    };
  }

  @Get('workflow/queues')
  @ApiOperation({ summary: 'Get entire active pipelines hierarchy tree (Queues -> Stages -> Steps -> Buttons -> Transitions)' })
  @ApiResponse({ status: 200, description: 'Nested pipeline configuration trees.' })
  async getWorkflowQueues(@Req() req: any) {
    const queues = await this.workflowStore.getAllQueues(req.user.sub);
    const result: any[] = [];
    for (const q of queues) {
      const stages = await this.workflowStore.getStagesForQueue(q.id, req.user.sub);
      const stageData: any[] = [];
      for (const s of stages) {
        const steps = await this.workflowStore.getStepsForStage(s.id);
        const stepData: any[] = [];
        for (const st of steps) {
          const actionContent = await this.workflowStore.getActionContent(st.id);
          const buttons = await this.workflowStore.getButtonsForStep(st.id);
          const buttonData: any[] = [];
          for (const b of buttons) {
            const trans = await this.workflowStore.getButtonTransition(b.id);
            buttonData.push({
              id: b.id,
              label: b.label,
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
          stepData.push({
            id: st.id,
            name: st.name,
            actionType: st.actionType,
            actionContent,
            buttons: buttonData,
          });
        }
        stageData.push({
          id: s.id,
          name: s.name,
          orderIndex: s.orderIndex,
          steps: stepData,
        });
      }
      result.push({
        id: q.id,
        name: q.name,
        description: q.description,
        isActive: q.isActive,
        stages: stageData,
      });
    }
    return result;
  }


  // --- Lead Endpoints ---

  @Post()
  @ApiOperation({ summary: 'Register/Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully.', type: Lead })
  @ApiResponse({ status: 400, description: 'Empty pipeline or missing target stage references.' })
  async create(@Req() req: any, @Body() createLeadDto: CreateLeadDto): Promise<Lead> {
    return this.leadService.create(createLeadDto, req.user.sub, req.user.workspaceId);
  }

  @Public()
  @Post('public-register')
  @ApiOperation({ summary: 'Public endpoint to register leads (simulates external forms)' })
  @ApiResponse({ status: 201, description: 'Lead submitted successfully.', type: Lead })
  async registerPublicLead(@Body() createPublicLeadDto: CreatePublicLeadDto): Promise<Lead> {
    return this.leadService.registerPublicLead(createPublicLeadDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leads list with dynamic filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by lead status (active, converted, lost)' })
  @ApiQuery({ name: 'queueId', required: false, description: 'Filter by current Queue ID' })
  @ApiQuery({ name: 'stageId', required: false, description: 'Filter by current Stage ID' })
  @ApiQuery({ name: 'stepId', required: false, description: 'Filter by current Step ID' })
  @ApiQuery({ name: 'allocation', required: false, enum: ['allocated', 'unallocated', 'all'], description: 'Filter by lead allocation status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit number of leads per page (default 50)' })
  @ApiQuery({ name: 'search', required: false, description: 'Global or contextual search on postcode, suburb, state, or lead name' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['date', 'createdAt', 'updatedAt'], description: 'Sort field (defaults to updatedAt)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort order direction' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter leads starting from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter leads up to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Filtered list of all leads.', type: [Lead] })
  async findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('queueId') queueId?: string,
    @Query('stageId') stageId?: string,
    @Query('stepId') stepId?: string,
    @Query('allocation') allocation?: 'allocated' | 'unallocated' | 'all',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<Lead[]> {
    return this.leadService.findAll(req.user.sub, req.user.workspaceId, {
      status,
      queueId,
      stageId,
      stepId,
      allocation,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate,
    });
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get all converted customer records with filters, search, sorting, and pagination' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by customer status' })
  @ApiQuery({ name: 'queueId', required: false, description: 'Filter by current Queue ID' })
  @ApiQuery({ name: 'stageId', required: false, description: 'Filter by current Stage ID' })
  @ApiQuery({ name: 'stepId', required: false, description: 'Filter by current Step ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Limit size (default: 50)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search name, email, or phone' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (convertedAt, createdAt, updatedAt, firstName, lastName, contractStartDate)' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'], description: 'Sort direction (default: DESC)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'ISO start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'ISO end date' })
  @ApiResponse({ status: 200, description: 'List of customers.', type: [Customer] })
  async findCustomers(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('queueId') queueId?: string,
    @Query('stageId') stageId?: string,
    @Query('stepId') stepId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<Customer[]> {
    return this.leadService.findCustomers(req.user.sub, req.user.workspaceId, {
      status,
      queueId,
      stageId,
      stepId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      sortBy,
      sortOrder,
      startDate,
      endDate,
    });
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get details of a specific converted customer' })
  @ApiResponse({ status: 200, description: 'Customer details retrieved.', type: Customer })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async getCustomerDetails(@Req() req: any, @Param('id') id: string): Promise<Customer> {
    return this.leadService.findCustomerById(id, req.user.workspaceId, req.user.sub);
  }

  @Patch('customers/:id')
  @ApiOperation({ summary: 'Update a converted customer details' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully.', type: Customer })
  @ApiResponse({ status: 404, description: 'Customer not found.' })
  async updateCustomer(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.leadService.updateCustomer(id, updateCustomerDto, req.user.workspaceId, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed information about a lead (including current workflow node and action buttons)' })
  @ApiResponse({ status: 200, description: 'Detailed lead details object.' })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async getLeadDetails(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.leadService.getLeadDetails(id, req.user.workspaceId, req.user.sub);
  }

  @Get(':id/raw')
  @ApiOperation({ summary: 'Get raw data of a specific lead' })
  @ApiResponse({ status: 200, description: 'Raw lead data retrieved.', type: Lead })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async getRawLead(@Req() req: any, @Param('id') id: string): Promise<Lead> {
    return this.leadService.findOne(id, req.user.workspaceId, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update specific lead details' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully.', type: Lead })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async updateLead(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ): Promise<Lead> {
    return this.leadService.update(id, updateLeadDto, req.user.workspaceId, req.user.sub);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a literal attachment file and link it to the lead' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Attachment uploaded and linked successfully.', type: Lead })
  @ApiResponse({ status: 404, description: 'Lead not found.' })
  async uploadLeadAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Lead> {
    return this.leadService.addAttachment(id, file, req.user.workspaceId, req.user.sub);
  }

  @Post(':id/execute-action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute the automated communication task on the lead\'s current step' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        buttonIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Optional list of specific step button UUIDs to render in the email (defaults to all buttons if omitted)'
        },
        regards: {
          type: 'string',
          description: 'Optional custom regards footer to attach at the bottom of the email'
        }
      }
    },
    required: false
  })
  @ApiResponse({ status: 200, description: 'Step action execution log recorded.', type: StepActionExecution })
  @ApiResponse({ status: 400, description: 'Lead is not active or step has no valid configurations.' })
  async executeAction(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { buttonIds?: string[]; regards?: string },
  ): Promise<StepActionExecution> {
    return this.leadService.executeAction(id, req.user.sub, body.buttonIds, body.regards);
  }

  @Post(':id/click-button')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate lead clicking an interaction button' })
  @ApiBody({ schema: { type: 'object', properties: { buttonId: { type: 'string', format: 'uuid', description: 'The UUID of the button clicked' } }, required: ['buttonId'] } })
  @ApiResponse({ status: 200, description: 'Button clicked and transition triggered successfully.', type: Lead })
  @ApiResponse({ status: 400, description: 'Invalid button association or transition rules.' })
  async clickButton(
    @Req() req: any,
    @Param('id') id: string,
    @Body('buttonId') buttonId: string,
  ): Promise<Lead> {
    return this.leadService.clickButton(id, buttonId, req.user.sub);
  }

  @Public()
  @Get(':id/click-button-redirect')
  @ApiOperation({ summary: 'Process button click via GET link (for email clients) and render a success page' })
  async clickButtonRedirect(
    @Param('id') id: string,
    @Query('buttonId') buttonId: string,
    @Res() res: any,
  ) {
    try {
      // Process transition (pass undefined as userId since it is clicked by the end recipient/lead)
      await this.leadService.clickButton(id, buttonId);

      const html = getRedirectHtml();
      res.type('html').send(html);
    } catch (err) {
      if (err.message && err.message.includes('already recorded')) {
        const html = getAlreadyRecordedHtml();
        res.type('html').send(html);
      } else {
        res.status(HttpStatus.BAD_REQUEST).send(err.message || 'Bad Request');
      }
    }
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually move lead to another Queue, Stage, or Step position' })
  @ApiBody({ schema: { type: 'object', properties: { queueId: { type: 'string', format: 'uuid' }, stageId: { type: 'string', format: 'uuid' }, stepId: { type: 'string', format: 'uuid' } } } })
  @ApiResponse({ status: 200, description: 'Lead moved manually successfully.', type: Lead })
  @ApiResponse({ status: 400, description: 'Invalid coordinate UUID references.' })
  async moveLead(
    @Req() req: any,
    @Param('id') id: string,
    @Body('queueId') queueId?: string,
    @Body('stageId') stageId?: string,
    @Body('stepId') stepId?: string,
  ): Promise<Lead> {
    return this.leadService.moveLead(id, queueId, stageId, stepId, req.user.sub, req.user.workspaceId);
  }

  @Post(':id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually convert lead to active customer record' })
  @ApiBody({ schema: { type: 'object', properties: { accountManagerId: { type: 'string', format: 'uuid' }, contractStartDate: { type: 'string', example: '2026-08-01' } } } })
  @ApiResponse({ status: 200, description: 'Lead successfully converted to Customer.', type: Customer })
  @ApiResponse({ status: 400, description: 'Lead is already converted.' })
  async convertToCustomer(
    @Req() req: any,
    @Param('id') id: string,
    @Body('accountManagerId') accountManagerId?: string,
    @Body('contractStartDate') contractStartDate?: string,
  ): Promise<Customer> {
    return this.leadService.convertToCustomer(id, {
      accountManagerId,
      contractStartDate,
    }, req.user.sub, req.user.workspaceId);
  }

  @Get(':id/transitions')
  @ApiOperation({ summary: 'Get pipeline movement/transition logs history for a lead' })
  @ApiResponse({ status: 200, description: 'Transition logs history list.', type: [ContactTransitionLog] })
  async getTransitions(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<ContactTransitionLog[]> {
    return this.leadService.getTransitions(id, req.user.workspaceId, req.user.sub);
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get automated action execution log history for a lead' })
  @ApiResponse({ status: 200, description: 'Execution logs list.', type: [StepActionExecution] })
  async getExecutions(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<StepActionExecution[]> {
    return this.leadService.getExecutions(id, req.user.workspaceId, req.user.sub);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get overall dashboard analytics statistics and chart data' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter dashboard stats starting from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter dashboard stats up to date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Dashboard stats payload retrieved successfully.' })
  async getDashboardStats(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.leadService.getDashboardStats(req.user.workspaceId, req.user.sub, { startDate, endDate });
  }

  @Post('allocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Allocate unassigned leads to a queue and stage' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        queueId: { type: 'string', format: 'uuid', description: 'The target Queue UUID (optional)' },
        stageId: { type: 'string', format: 'uuid', description: 'The target Stage UUID (optional)' },
        count: { type: 'number', description: 'Number of random unallocated leads to allocate (default 5, used only if leadIds is empty)' },
        leadIds: { 
          type: 'array', 
          items: { type: 'string', format: 'uuid' }, 
          description: 'List of specific unallocated Lead UUIDs to allocate to this queue/stage' 
        },
        allocations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              leadId: { type: 'string', format: 'uuid' },
              queueId: { type: 'string', format: 'uuid' },
              stageId: { type: 'string', format: 'uuid' }
            },
            required: ['leadId']
          },
          description: 'Optional batch allocations to assign different leads to different stages/queues'
        }
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Leads successfully allocated to queue/stage.', type: [Lead] })
  async allocateLeads(
    @Req() req: any,
    @Body('queueId') queueId?: string,
    @Body('stageId') stageId?: string,
    @Body('count') count?: number,
    @Body('leadIds') leadIds?: string[],
    @Body('allocations') allocations?: { leadId: string; queueId?: string; stageId?: string }[],
  ): Promise<Lead[]> {
    return this.leadService.allocateLeads(
      queueId,
      stageId,
      count,
      req.user.sub,
      leadIds,
      req.user.workspaceId,
      allocations,
    );
  }
}
