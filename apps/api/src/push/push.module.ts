import { Global, Module } from '@nestjs/common';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';

/** Notifications Web Push (ADR-0014) : global, utilisé par le planificateur pour les rappels. */
@Global()
@Module({ controllers: [PushController], providers: [PushService], exports: [PushService] })
export class PushModule {}
