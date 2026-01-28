import { getDatabase } from '@config/database';
import { v4 as uuidv4 } from 'uuid';

export class InventoryRepository {
  // ===== INVENTORY ITEMS =====
  async create(name: string, description: string, typeId: string, quantity: number, minQuantity: number, maxQuantity: number, unit: string, location: string): Promise<any> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO inventory (id, name, description, typeId, quantity, minQuantity, maxQuantity, unit, location, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, typeId, quantity, minQuantity, maxQuantity, unit, location, now, now]
    );

    return this.findById(id);
  }

  async findById(id: string): Promise<any> {
    const db = getDatabase();
    return db.get('SELECT * FROM inventory WHERE id = ?', [id]) || null;
  }

  async findAll(): Promise<any[]> {
    const db = getDatabase();
    const result = await db.all('SELECT * FROM inventory ORDER BY name ASC');
    return result || [];
  }

  async findByType(typeId: string): Promise<any[]> {
    const db = getDatabase();
    const result = await db.all('SELECT * FROM inventory WHERE typeId = ? ORDER BY name ASC', [typeId]);
    return result || [];
  }

  async update(id: string, data: Partial<any>): Promise<any> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    await db.run(
      `UPDATE inventory SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM inventory WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }

  // ===== INVENTORY TYPES =====
  async createType(name: string, description: string): Promise<any> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO inventory_types (id, name, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, description, now, now]
    );

    return this.findTypeById(id);
  }

  async findTypeById(id: string): Promise<any> {
    const db = getDatabase();
    return db.get('SELECT * FROM inventory_types WHERE id = ?', [id]) || null;
  }

  async findAllTypes(): Promise<any[]> {
    const db = getDatabase();
    const result = await db.all('SELECT * FROM inventory_types ORDER BY name ASC');
    return result || [];
  }

  async updateType(id: string, data: Partial<any>): Promise<any> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: unknown[] = [];

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findTypeById(id);
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(id);

    await db.run(
      `UPDATE inventory_types SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return this.findTypeById(id);
  }

  async deleteType(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.run('DELETE FROM inventory_types WHERE id = ?', [id]);
    return (result.changes || 0) > 0;
  }
}

export default new InventoryRepository();
