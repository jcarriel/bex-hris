import InventoryRepository from '@repositories/InventoryRepository';
import logger from '@utils/logger';

export class InventoryService {
  // ===== INVENTORY ITEMS =====
  async createInventoryItem(name: string, description: string, typeId: string, quantity: number, minQuantity: number, maxQuantity: number, unit: string, location: string): Promise<any> {
    try {
      if (!name || !typeId) {
        throw new Error('Name and typeId are required');
      }

      return await InventoryRepository.create(name, description, typeId, quantity, minQuantity, maxQuantity, unit, location);
    } catch (error) {
      logger.error('Error creating inventory item', error);
      throw error;
    }
  }

  async getInventoryItem(id: string): Promise<any> {
    try {
      return await InventoryRepository.findById(id);
    } catch (error) {
      logger.error('Error getting inventory item', error);
      throw error;
    }
  }

  async getAllInventoryItems(): Promise<any[]> {
    try {
      return await InventoryRepository.findAll();
    } catch (error) {
      logger.error('Error getting all inventory items', error);
      throw error;
    }
  }

  async getInventoryByType(typeId: string): Promise<any[]> {
    try {
      return await InventoryRepository.findByType(typeId);
    } catch (error) {
      logger.error('Error getting inventory by type', error);
      throw error;
    }
  }

  async updateInventoryItem(id: string, data: Partial<any>): Promise<any> {
    try {
      return await InventoryRepository.update(id, data);
    } catch (error) {
      logger.error('Error updating inventory item', error);
      throw error;
    }
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    try {
      return await InventoryRepository.delete(id);
    } catch (error) {
      logger.error('Error deleting inventory item', error);
      throw error;
    }
  }

  // ===== INVENTORY TYPES =====
  async createInventoryType(name: string, description: string): Promise<any> {
    try {
      if (!name) {
        throw new Error('Name is required');
      }

      return await InventoryRepository.createType(name, description);
    } catch (error) {
      logger.error('Error creating inventory type', error);
      throw error;
    }
  }

  async getInventoryType(id: string): Promise<any> {
    try {
      return await InventoryRepository.findTypeById(id);
    } catch (error) {
      logger.error('Error getting inventory type', error);
      throw error;
    }
  }

  async getAllInventoryTypes(): Promise<any[]> {
    try {
      return await InventoryRepository.findAllTypes();
    } catch (error) {
      logger.error('Error getting all inventory types', error);
      throw error;
    }
  }

  async updateInventoryType(id: string, data: Partial<any>): Promise<any> {
    try {
      return await InventoryRepository.updateType(id, data);
    } catch (error) {
      logger.error('Error updating inventory type', error);
      throw error;
    }
  }

  async deleteInventoryType(id: string): Promise<boolean> {
    try {
      return await InventoryRepository.deleteType(id);
    } catch (error) {
      logger.error('Error deleting inventory type', error);
      throw error;
    }
  }
}

export default new InventoryService();
