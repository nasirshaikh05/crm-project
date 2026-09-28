import { Controller, Get, Patch, Body, Req, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the profile of the currently logged-in user' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully.' })
  async getProfile(@Req() req: any) {
    const user = await this.userService.findById(req.user.sub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { passwordHash, ...result } = user;
    return result;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the profile/credentials of the currently logged-in user' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation or update constraints failed.' })
  @ApiResponse({ status: 409, description: 'Email address already in use.' })
  async updateProfile(@Req() req: any, @Body() updateDto: UpdateUserDto) {
    const userId = req.user.sub;
    const updatedUser = await this.userService.update(userId, updateDto);
    const { passwordHash, ...result } = updatedUser;
    return result;
  }
}
