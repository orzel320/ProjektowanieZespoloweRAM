import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class BoardsService {
  private readonly timeoutMs = 120_000;

  async generate(topic: string, difficulty: string): Promise<unknown> {
    const baseUrl = process.env.AI_SERVICE_URL?.replace(/\/$/, '');
    if (!baseUrl) {
      throw new HttpException(
        'AI service is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      let res: Response;
      try {
        res = await fetch(`${baseUrl}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, difficulty }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new HttpException(
            'AI service timeout',
            HttpStatus.GATEWAY_TIMEOUT,
          );
        }
        throw new HttpException(
          'AI service unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const text = await res.text();

      if (!res.ok) {
        if (res.status >= 500) {
          throw new HttpException(
            'AI service returned an error',
            HttpStatus.BAD_GATEWAY,
          );
        }
        throw new HttpException(
          text || 'AI request failed',
          res.status >= 400 ? res.status : HttpStatus.BAD_GATEWAY,
        );
      }

      try {
        return JSON.parse(text) as unknown;
      } catch {
        throw new HttpException(
          'Invalid response from AI service',
          HttpStatus.BAD_GATEWAY,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
