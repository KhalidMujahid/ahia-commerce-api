import { Controller, Get, Put, Delete, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, AddressDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/constants';
import { UserRole } from '../auth/constants';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateProfile(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 200, description: 'Account deactivated successfully' })
  async deleteAccount(@Request() req: any) {
    return this.usersService.delete(req.user.id, req.user.id);
  }

  @Get('me/addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user addresses' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved' })
  async getAddresses(@Request() req: any) {
    return this.usersService.getAddresses(req.user.id);
  }

  @Post('me/addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add new address' })
  @ApiResponse({ status: 201, description: 'Address added successfully' })
  async addAddress(@Request() req: any, @Body() addressDto: AddressDto) {
    return this.usersService.addAddress(req.user.id, addressDto);
  }

  @Put('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update address' })
  @ApiResponse({ status: 200, description: 'Address updated successfully' })
  async updateAddress(
    @Request() req: any,
    @Param('id') addressId: string,
    @Body() addressDto: Partial<AddressDto>,
  ) {
    return this.usersService.updateAddress(req.user.id, addressId, addressDto);
  }

  @Delete('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete address' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  async deleteAddress(@Request() req: any, @Param('id') addressId: string) {
    return this.usersService.deleteAddress(req.user.id, addressId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
  ) {
    return this.usersService.getAllUsers(page || 1, limit || 20, role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Put(':id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User activated' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }
}
