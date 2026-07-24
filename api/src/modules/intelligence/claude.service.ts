import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

const REQUEST_TIMEOUT_MS = 30_000;

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private readonly client: Anthropic;

  constructor(configService: ConfigService) {
    this.client = new Anthropic({ apiKey: configService.getOrThrow<string>('ANTHROPIC_API_KEY') });
  }

  /**
   * Calls Claude and validates its response against a Zod schema via
   * structured outputs, so a malformed or hallucinated shape is a thrown
   * error here rather than a wrongly-typed value flowing into a repository
   * or, worse, an HTTP response. Callers are expected to catch and fall back
   * — never let this throw all the way out to the client, since this is
   * commentary on real data, not something the request should hard-fail on.
   */
  async structuredComplete<T>(params: { schema: z.ZodType<T>; system: string; prompt: string }): Promise<T> {
    const response = await this.client.messages.parse(
      {
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        thinking: { type: 'adaptive' },
        output_config: {
          effort: 'medium',
          format: zodOutputFormat(params.schema),
        },
        system: params.system,
        messages: [{ role: 'user', content: params.prompt }],
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );

    if (response.stop_reason === 'refusal') {
      throw new Error('Claude declined to respond');
    }
    if (response.parsed_output === null) {
      this.logger.warn('Claude response did not match the expected schema');
      throw new Error('Claude returned output that did not match the expected schema');
    }
    return response.parsed_output;
  }
}
