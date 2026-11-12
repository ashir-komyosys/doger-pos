import { Body, Controller, Get, Param, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  publicWebsiteOrderSchema,
  type PublicWebsiteOrderDto,
} from '@nodedr-restaurant/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PublicWebsiteService } from './public-website.service';

// Deliberately unauthenticated — this is the customer-facing public menu
// and ordering flow. A guest has no account. Only reachable by the opaque
// per-branch publicToken (Settings > Public website), never by a guessable id.
@ApiTags('public')
@Controller('v1/public')
export class PublicWebsiteController {
  constructor(private readonly website: PublicWebsiteService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':publicToken/menu')
  getMenu(@Param('publicToken') publicToken: string) {
    return this.website.getMenu(publicToken);
  }

  // Tighter than the app-wide default — this is unauthenticated and
  // directly creates kitchen tickets, so it's an abuse target.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':publicToken/order')
  @UsePipes(new ZodValidationPipe(publicWebsiteOrderSchema))
  createOrder(@Param('publicToken') publicToken: string, @Body() body: unknown) {
    return this.website.createOrder(publicToken, body as PublicWebsiteOrderDto);
  }
}
