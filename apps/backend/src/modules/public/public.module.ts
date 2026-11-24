import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { PublicKioskController } from './public-kiosk.controller';
import { PublicKioskService } from './public-kiosk.service';
import { PublicMenuController } from './public-menu.controller';
import { PublicMenuService } from './public-menu.service';
import { PublicWebsiteController } from './public-website.controller';
import { PublicWebsiteService } from './public-website.service';

@Module({
  imports: [OrdersModule, NotificationsModule, AuthModule],
  controllers: [
    PublicMenuController,
    PublicKioskController,
    PublicWebsiteController,
  ],
  providers: [PublicMenuService, PublicKioskService, PublicWebsiteService],
})
export class PublicModule {}
