import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { Workspace } from './entities/workspace.entity';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@ApiTags('workspaces')
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a company logo for the workspace' })
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
  @ApiResponse({ status: 200, type: Workspace, description: 'Workspace updated with the new logo URL.' })
  async uploadLogo(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Workspace> {
    return this.workspaceService.uploadLogo(id, file, req.user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({ status: 201, type: Workspace })
  async create(@Req() req: any, @Body() createWorkspaceDto: CreateWorkspaceDto): Promise<Workspace> {
    return this.workspaceService.create(createWorkspaceDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workspaces for the current user' })
  @ApiResponse({ status: 200, type: [Workspace] })
  async findAll(@Req() req: any): Promise<Workspace[]> {
    return this.workspaceService.findAll(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific workspace detail' })
  @ApiResponse({ status: 200, type: Workspace })
  async findOne(@Req() req: any, @Param('id') id: string): Promise<Workspace> {
    return this.workspaceService.findOne(id, req.user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workspace configurations (e.g. orgName, logoUrl)' })
  @ApiResponse({ status: 200, type: Workspace })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaceService.update(id, updateWorkspaceDto, req.user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workspace' })
  async remove(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.workspaceService.remove(id, req.user.sub);
  }
}
