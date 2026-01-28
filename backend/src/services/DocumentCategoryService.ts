import DocumentCategoryRepository from '@repositories/DocumentCategoryRepository';
import logger from '@utils/logger';

export class DocumentCategoryService {
  async createCategory(name: string, description?: string): Promise<any> {
    try {
      const category = await DocumentCategoryRepository.create(name, description);
      logger.info(`Document category created: ${name}`);
      return category;
    } catch (error) {
      logger.error('Error creating document category', error);
      throw error;
    }
  }

  async getCategory(id: string): Promise<any> {
    try {
      return await DocumentCategoryRepository.findById(id);
    } catch (error) {
      logger.error('Error getting document category', error);
      throw error;
    }
  }

  async getCategoryByName(name: string): Promise<any> {
    try {
      return await DocumentCategoryRepository.findByName(name);
    } catch (error) {
      logger.error('Error getting document category by name', error);
      throw error;
    }
  }

  async getAllCategories(): Promise<any[]> {
    try {
      return await DocumentCategoryRepository.findAll();
    } catch (error) {
      logger.error('Error getting document categories', error);
      throw error;
    }
  }

  async updateCategory(id: string, data: Partial<any>): Promise<any> {
    try {
      const category = await DocumentCategoryRepository.update(id, data);
      logger.info(`Document category updated: ${id}`);
      return category;
    } catch (error) {
      logger.error('Error updating document category', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const result = await DocumentCategoryRepository.delete(id);
      if (result) {
        logger.info(`Document category deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting document category', error);
      throw error;
    }
  }
}

export default new DocumentCategoryService();
