import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FormService } from './form.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitFormDto } from './dto/submit-form.dto';
import { FormEntity } from './entities/form.entity';
import { FormSubmissionEntity } from './entities/form-submission.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiBearerAuth()
@ApiTags('forms')
@Controller('forms')
export class FormController {
  constructor(private readonly formService: FormService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new dynamic form configuration' })
  @ApiResponse({ status: 201, description: 'The form configuration has been successfully created.', type: FormEntity })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  async create(@Req() req: any, @Body() createFormDto: CreateFormDto): Promise<FormEntity> {
    return this.formService.create(createFormDto, req.user.sub, req.user.workspaceId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all forms belonging to the current user' })
  @ApiResponse({ status: 200, description: 'List of all form configurations.', type: [FormEntity] })
  async findAll(@Req() req: any): Promise<FormEntity[]> {
    return this.formService.findAll(req.user.workspaceId);
  }

  @Public()
  @Get('pwa/:token')
  @ApiOperation({ summary: 'Get details of a form by decoding its JWT token' })
  @ApiResponse({ status: 200, description: 'Form configuration retrieved successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token.' })
  @ApiResponse({ status: 404, description: 'Form not found or inactive.' })
  async findOneByToken(@Param('token') token: string): Promise<any> {
    return this.formService.findOneByToken(token);
  }

  @Public()
  @Get('public/:id')
  @ApiOperation({ summary: 'Get details of a specific active form for public rendering (does not require authentication)' })
  @ApiResponse({ status: 200, description: 'Form configuration retrieved successfully.', type: FormEntity })
  @ApiResponse({ status: 404, description: 'Form not found or inactive.' })
  async findOnePublic(@Param('id') id: string): Promise<FormEntity> {
    const form = await this.formService.findOne(id);
    if (!form.isActive) {
      throw new NotFoundException(`Form with ID "${id}" is not active or available.`);
    }
    return form;
  }

  @Public()
  @Post('public/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit answers for a specific form (does not require authentication)' })
  @ApiResponse({ status: 200, description: 'Answers successfully submitted.', type: FormSubmissionEntity })
  @ApiResponse({ status: 404, description: 'Form not found or inactive.' })
  async submit(
    @Param('id') id: string,
    @Body() submitFormDto: SubmitFormDto,
  ): Promise<FormSubmissionEntity> {
    return this.formService.submit(id, submitFormDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific form configuration' })
  @ApiResponse({ status: 200, description: 'Form details retrieved successfully.', type: FormEntity })
  @ApiResponse({ status: 404, description: 'Form not found.' })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<FormEntity> {
    return this.formService.findOne(id, req.user.workspaceId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing form configuration' })
  @ApiResponse({ status: 200, description: 'The form has been successfully updated.', type: FormEntity })
  @ApiResponse({ status: 404, description: 'Form not found.' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateFormDto: UpdateFormDto,
  ): Promise<FormEntity> {
    return this.formService.update(id, updateFormDto, req.user.workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a form configuration' })
  @ApiResponse({ status: 204, description: 'Form configuration deleted successfully (No Content).' })
  @ApiResponse({ status: 404, description: 'Form not found.' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.formService.remove(id, req.user.workspaceId);
  }
}
