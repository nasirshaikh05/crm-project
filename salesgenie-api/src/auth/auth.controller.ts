import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new staff/user account' })
  @ApiResponse({ status: 201, description: 'The user has been registered successfully.' })
  @ApiResponse({ status: 400, description: 'Registration constraints failed.' })
  @ApiResponse({ status: 409, description: 'User already exists.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful. Returns access and refresh tokens.' })
  @ApiResponse({ status: 401, description: 'Invalid login credentials.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh authentication access token' })
  @ApiResponse({ status: 200, description: 'Access token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token.' })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('switch-workspace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active workspace and receive a new access token' })
  @ApiResponse({ status: 200, description: 'Workspace switched successfully.' })
  async switchWorkspace(@Req() req: any, @Body('workspaceId') workspaceId: string) {
    return this.authService.switchWorkspace(req.user.sub, workspaceId);
  }

  @ApiBearerAuth()
  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired JWT access token.' })
  async signout() {
    return this.authService.signout();
  }
}
