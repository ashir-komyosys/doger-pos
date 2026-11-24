import { Body, Controller, Get, Param, Post, Req, Res, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  publicWebsiteOrderSchema,
  storefrontLoginSchema,
  storefrontOrderSchema,
  storefrontRegisterSchema,
  type PublicWebsiteOrderDto,
} from '@nodedr-restaurant/types';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { Request, Response } from 'express';
import { PublicWebsiteService } from './public-website.service';

// Deliberately unauthenticated — this is the customer-facing public menu
// and ordering flow. A guest has no account. Only reachable by the opaque
// per-branch publicToken (Settings > Public website), never by a guessable id.
@ApiTags('public')
@Controller('v1/public')
export class PublicWebsiteController {
  constructor(private readonly website: PublicWebsiteService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':publicToken/customer/register')
  @UsePipes(new ZodValidationPipe(storefrontRegisterSchema))
  async registerCustomer(@Param('publicToken') token: string, @Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const result = await this.website.registerCustomer(token, body as never);
    this.setCustomerCookie(res, result.token);
    return { user: result.user };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':publicToken/customer/login')
  @UsePipes(new ZodValidationPipe(storefrontLoginSchema))
  async loginCustomer(@Param('publicToken') token: string, @Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const result = await this.website.loginCustomer(token, body as never);
    this.setCustomerCookie(res, result.token);
    return { user: result.user };
  }

  @Get(':publicToken/customer/me')
  async customerMe(@Param('publicToken') token: string, @Req() req: Request) {
    return { user: await this.website.getCustomerSession(token, req.cookies?.storefront_customer_session ?? '') };
  }

  @Post(':publicToken/customer/logout')
  logoutCustomer(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('storefront_customer_session', { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true' });
    return { ok: true };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':publicToken/customer/order')
  @UsePipes(new ZodValidationPipe(storefrontOrderSchema))
  customerOrder(@Param('publicToken') token: string, @Req() req: Request, @Body() body: unknown) {
    return this.website.createCustomerOrder(token, req.cookies?.storefront_customer_session ?? '', body as never);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get(':publicToken/menu')
  getMenu(@Param('publicToken') publicToken: string) {
    return this.website.getMenu(publicToken);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':publicToken/journal')
  listJournal(@Param('publicToken') publicToken: string) {
    return this.website.listJournal(publicToken);
  }

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get(':publicToken/journal/:slug')
  getJournalArticle(
    @Param('publicToken') publicToken: string,
    @Param('slug') slug: string,
  ) {
    return this.website.getJournalArticle(publicToken, slug);
  }

  // Tighter than the app-wide default — this is unauthenticated and
  // directly creates kitchen tickets, so it's an abuse target.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post(':publicToken/order')
  @UsePipes(new ZodValidationPipe(publicWebsiteOrderSchema))
  createOrder(@Param('publicToken') publicToken: string, @Body() body: unknown) {
    return this.website.createOrder(publicToken, body as PublicWebsiteOrderDto);
  }

  private setCustomerCookie(res: Response, token: string) {
    res.cookie('storefront_customer_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 12 * 60 * 60 * 1000 });
  }
}
