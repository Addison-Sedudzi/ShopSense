import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { ApiResponse, Me } from '@shopsense/shared';
import { AuthGuard, type AuthenticatedUser } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { MeRepository } from './me.repository';

@ApiTags('me')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing, invalid, or expired Bearer token' })
@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly meRepository: MeRepository) {}

  @Get()
  async me(@CurrentUser() user: AuthenticatedUser): Promise<ApiResponse<Me>> {
    const me = await this.meRepository.findByUserId(user.id, user.shopId);
    if (!me) {
      throw new NotFoundException('User is not linked to a shop');
    }
    return { success: true, data: me };
  }
}
