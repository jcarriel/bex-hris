import { EmailProvider } from './providers/EmailProvider';
import { AppNotificationProvider } from './providers/AppNotificationProvider';
import { WhatsAppProvider } from './providers/WhatsAppProvider';
import { TelegramProvider } from './providers/TelegramProvider';
import { INotificationProvider, NotificationPayload } from './interfaces/INotificationProvider';
import logger from '@utils/logger';

export class NotificationService {
  private providers: Map<string, INotificationProvider>;

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('email', new EmailProvider());
    this.providers.set('app', new AppNotificationProvider());
    this.providers.set('whatsapp', new WhatsAppProvider());
    this.providers.set('telegram', new TelegramProvider());
  }

  /**
   * Send notification through specific channel
   */
  async sendViaChannel(
    channel: 'email' | 'app' | 'whatsapp' | 'telegram',
    payload: NotificationPayload
  ): Promise<boolean> {
    const provider = this.providers.get(channel);

    if (!provider) {
      logger.error(`Unknown notification channel: ${channel}`);
      return false;
    }

    if (!provider.isConfigured()) {
      logger.warn(`Notification channel ${channel} is not configured`);
      return false;
    }

    try {
      return await provider.send(payload);
    } catch (error) {
      logger.error(`Error sending notification via ${channel}`, error);
      return false;
    }
  }

  /**
   * Send notification through multiple channels
   */
  async sendViaMultipleChannels(
    channels: Array<'email' | 'app' | 'whatsapp' | 'telegram'>,
    payload: NotificationPayload
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const channel of channels) {
      results[channel] = await this.sendViaChannel(channel, payload);
    }

    return results;
  }

  /**
   * Send notification through all configured channels
   */
  async sendViaAllChannels(payload: NotificationPayload): Promise<Record<string, boolean>> {
    const channels: Array<'email' | 'app' | 'whatsapp' | 'telegram'> = [
      'email',
      'app',
      'whatsapp',
      'telegram',
    ];
    return this.sendViaMultipleChannels(channels, payload);
  }

  /**
   * Get configured channels
   */
  getConfiguredChannels(): string[] {
    const configured: string[] = [];

    this.providers.forEach((provider, channel) => {
      if (provider.isConfigured()) {
        configured.push(channel);
      }
    });

    return configured;
  }

  /**
   * Register custom notification provider
   */
  registerProvider(channel: string, provider: INotificationProvider): void {
    this.providers.set(channel, provider);
    logger.info(`Notification provider registered: ${channel}`);
  }
}

export default new NotificationService();
