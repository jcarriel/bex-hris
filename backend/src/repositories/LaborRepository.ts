import { v4 as uuidv4 } from 'uuid';
import logger from '@utils/logger';

interface Labor {
  id: string;
  name: string;
  description?: string;
  positionId: string;
  createdAt: string;
  updatedAt: string;
}

class LaborRepository {
  private labors: Labor[] = [];

  create(name: string, description: string, positionId: string): Labor {
    const labor: Labor = {
      id: uuidv4(),
      name,
      description,
      positionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.labors.push(labor);
    logger.info(`Labor created: ${labor.id}`);
    return labor;
  }

  getAll(): Labor[] {
    return this.labors;
  }

  getById(id: string): Labor | undefined {
    return this.labors.find((labor) => labor.id === id);
  }

  getByPositionId(positionId: string): Labor[] {
    return this.labors.filter((labor) => labor.positionId === positionId);
  }

  update(id: string, name: string, description: string, positionId: string): Labor | undefined {
    const labor = this.labors.find((l) => l.id === id);
    if (!labor) return undefined;

    labor.name = name;
    labor.description = description;
    labor.positionId = positionId;
    labor.updatedAt = new Date().toISOString();
    logger.info(`Labor updated: ${id}`);
    return labor;
  }

  delete(id: string): boolean {
    const index = this.labors.findIndex((labor) => labor.id === id);
    if (index === -1) return false;

    this.labors.splice(index, 1);
    logger.info(`Labor deleted: ${id}`);
    return true;
  }
}

export default new LaborRepository();
