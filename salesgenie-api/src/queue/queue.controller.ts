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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { Queue } from './entities/queue.entity';

@ApiBearerAuth()
@ApiTags('queues')
@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new pipeline queue' })
  @ApiResponse({ status: 201, description: 'The queue has been successfully created.', type: Queue })
  @ApiResponse({ status: 400, description: 'Invalid request body.' })
  async create(@Req() req: any, @Body() createQueueDto: CreateQueueDto): Promise<Queue> {
    return this.queueService.create(createQueueDto, req.user.sub, req.user.workspaceId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pipeline queues' })
  @ApiResponse({ status: 200, description: 'List of all queues.', type: [Queue] })
  async findAll(@Req() req: any): Promise<Queue[]> {
    return this.queueService.findAll(req.user.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific queue' })
  @ApiResponse({ status: 200, description: 'Queue details retrieved successfully.', type: Queue })
  @ApiResponse({ status: 404, description: 'Queue not found.' })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<Queue> {
    return this.queueService.findOne(id, req.user.workspaceId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing queue' })
  @ApiResponse({ status: 200, description: 'The queue has been successfully updated.', type: Queue })
  @ApiResponse({ status: 404, description: 'Queue not found.' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateQueueDto: UpdateQueueDto,
  ): Promise<Queue> {
    return this.queueService.update(id, updateQueueDto, req.user.workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a queue' })
  @ApiResponse({ status: 204, description: 'Queue deleted successfully (No Content).' })
  @ApiResponse({ status: 400, description: 'Cannot delete queue due to active leads or dependency constraints.' })
  @ApiResponse({ status: 404, description: 'Queue not found.' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.queueService.remove(id, req.user.workspaceId);
  }
}
