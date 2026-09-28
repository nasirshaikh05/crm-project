import {
  Controller,
  Get,
  Req,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StageService } from './stage.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { Stage } from './entities/stage.entity';

@ApiBearerAuth()
@ApiTags('stages')
@Controller('stages')
export class StageController {
  constructor(private readonly stageService: StageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new stage/column' })
  @ApiResponse({ status: 201, description: 'Stage successfully created.', type: Stage })
  @ApiResponse({ status: 400, description: 'Invalid stage details or referenced Queue ID does not exist.' })
  async create(@Req() req: any, @Body() createStageDto: CreateStageDto): Promise<Stage> {
    return this.stageService.create(createStageDto, req.user.sub, req.user.workspaceId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stages across all queues' })
  @ApiResponse({ status: 200, description: 'List of all stages.', type: [Stage] })
  async findAll(@Req() req: any): Promise<Stage[]> {
    return this.stageService.findAll(req.user.workspaceId);
  }

  @Get('queue/:queueId')
  @ApiOperation({ summary: 'Get stages belonging to a specific queue' })
  @ApiResponse({ status: 200, description: 'List of stages for the queue, ordered by orderIndex.', type: [Stage] })
  @ApiResponse({ status: 404, description: 'Referenced Queue ID not found.' })
  async findForQueue(@Req() req: any, @Param('queueId') queueId: string): Promise<Stage[]> {
    return this.stageService.findForQueue(queueId, req.user.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific stage' })
  @ApiResponse({ status: 200, description: 'Stage details retrieved successfully.', type: Stage })
  @ApiResponse({ status: 404, description: 'Stage not found.' })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<Stage> {
    return this.stageService.findOne(id, req.user.workspaceId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing stage' })
  @ApiResponse({ status: 200, description: 'Stage details updated successfully.', type: Stage })
  @ApiResponse({ status: 404, description: 'Stage not found.' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateStageDto: UpdateStageDto,
  ): Promise<Stage> {
    return this.stageService.update(id, updateStageDto, req.user.workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a stage' })
  @ApiResponse({ status: 204, description: 'Stage deleted successfully (No Content).' })
  @ApiResponse({ status: 400, description: 'Cannot delete stage due to active leads or dependency constraints.' })
  @ApiResponse({ status: 404, description: 'Stage not found.' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.stageService.remove(id, req.user.workspaceId);
  }
}
