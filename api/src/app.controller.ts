import { Controller, Get } from '@nestjs/common';
import type { ApiResponse } from '@shopsense/shared';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth(): ApiResponse<{ status: string }> {
    return this.appService.getHealth();
  }
}
