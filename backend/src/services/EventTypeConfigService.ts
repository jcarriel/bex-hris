import EventTypeConfigRepository, { EventTypeConfig } from '@repositories/EventTypeConfigRepository';
import logger from '@utils/logger';

class EventTypeConfigService {
  async getAll(): Promise<EventTypeConfig[]> {
    return EventTypeConfigRepository.getAll();
  }

  async getByType(type: string): Promise<EventTypeConfig | null> {
    return EventTypeConfigRepository.getByType(type);
  }

  async update(type: string, daysNotice: number, enabled: boolean): Promise<EventTypeConfig | null> {
    if (daysNotice < 0 || daysNotice > 365) throw new Error('daysNotice debe estar entre 0 y 365');
    const cfg = await EventTypeConfigRepository.update(type, daysNotice, enabled);
    logger.info(`Event config updated: ${type} → daysNotice=${daysNotice}, enabled=${enabled}`);
    return cfg;
  }

  async seed(): Promise<void> {
    await EventTypeConfigRepository.seed();
  }
}

export default new EventTypeConfigService();
