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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StepService } from './step.service';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { CreateButtonDto } from './dto/create-button.dto';
import { UpdateButtonDto } from './dto/update-button.dto';
import { ConfigureTransitionDto } from './dto/configure-transition.dto';
import { Step } from './entities/step.entity';
import { StepButton } from './entities/step-button.entity';
import { StepButtonTransition } from './entities/step-button-transition.entity';

@ApiBearerAuth()
@ApiTags('steps')
@Controller('steps')
export class StepController {
  constructor(private readonly stepService: StepService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new step in a stage' })
  @ApiResponse({ status: 201, description: 'Step created successfully.', type: Step })
  @ApiResponse({ status: 400, description: 'Referenced Stage ID does not exist.' })
  async create(@Body() createStepDto: CreateStepDto): Promise<Step> {
    return this.stepService.create(createStepDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all steps in the system (assigned and template steps)' })
  @ApiResponse({ status: 200, description: 'List of all steps.', type: [Step] })
  async findAll(): Promise<Step[]> {
    return this.stepService.findAll();
  }



  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific step' })
  @ApiResponse({ status: 200, description: 'Step details retrieved successfully.', type: Step })
  @ApiResponse({ status: 404, description: 'Step not found.' })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.stepService.findOneWithConfig(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing step' })
  @ApiResponse({ status: 200, description: 'Step successfully updated.', type: Step })
  @ApiResponse({ status: 404, description: 'Step not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateStepDto: UpdateStepDto,
  ): Promise<Step> {
    return this.stepService.update(id, updateStepDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a step' })
  @ApiResponse({ status: 204, description: 'Step successfully deleted (No Content).' })
  @ApiResponse({ status: 400, description: 'Cannot delete step due to active leads assigned to it.' })
  @ApiResponse({ status: 404, description: 'Step not found.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.stepService.remove(id);
  }

  // --- Button Endpoints ---

  @Post(':id/buttons')
  @ApiOperation({ summary: 'Add a button to a specific step' })
  @ApiResponse({ status: 201, description: 'Button successfully added to the step.', type: StepButton })
  @ApiResponse({ status: 404, description: 'Step not found.' })
  async addButton(
    @Param('id') id: string,
    @Body() createButtonDto: CreateButtonDto,
  ): Promise<StepButton> {
    return this.stepService.addButton(id, createButtonDto);
  }

  @Put('buttons/:id')
  @ApiOperation({ summary: 'Update an existing step button' })
  @ApiResponse({ status: 200, description: 'Button updated successfully.', type: StepButton })
  @ApiResponse({ status: 404, description: 'Button not found.' })
  async updateButton(
    @Param('id') id: string,
    @Body() updateButtonDto: UpdateButtonDto,
  ): Promise<StepButton> {
    return this.stepService.updateButton(id, updateButtonDto);
  }

  @Delete('buttons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a step button' })
  @ApiResponse({ status: 204, description: 'Button deleted successfully (No Content).' })
  @ApiResponse({ status: 404, description: 'Button not found.' })
  async removeButton(@Param('id') id: string): Promise<void> {
    await this.stepService.removeButton(id);
  }

  // --- Transition Binding ---

  @Post('buttons/:buttonId/transitions')
  @ApiOperation({ summary: 'Configure or update routing transition for a step button' })
  @ApiResponse({ status: 201, description: 'Transition details mapped successfully.', type: StepButtonTransition })
  @ApiResponse({ status: 400, description: 'Invalid target reference IDs.' })
  @ApiResponse({ status: 404, description: 'Button not found.' })
  async configureTransition(
    @Param('buttonId') buttonId: string,
    @Body() configureTransitionDto: ConfigureTransitionDto,
  ): Promise<StepButtonTransition> {
    return this.stepService.configureTransition(buttonId, configureTransitionDto);
  }
}
