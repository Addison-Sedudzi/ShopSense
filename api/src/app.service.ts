import { Injectable } from '@nestjs/common';
import type { ApiResponse } from '@shopsense/shared';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getHealth(): ApiResponse<{ status: string }> {
    return { success: true, data: { status: 'ok' } };
  }
}
