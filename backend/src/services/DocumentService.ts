import DocumentRepository from '@repositories/DocumentRepository';
import logger from '@utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class DocumentService {
  private uploadDir = path.join(process.cwd(), 'uploads', 'documents');

  constructor() {
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadDocument(employeeId: string, file: any, documentType: string, cedula: string): Promise<any> {
    try {
      // Estructura: Cedula -> Categoria -> Fecha -> Nombre.extension
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const categoryDir = path.join(this.uploadDir, cedula, documentType, today);

      // Crear directorios si no existen
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true });
      }

      const fileName = file.originalname;
      const filePath = path.join(categoryDir, fileName);

      // Guardar archivo
      fs.writeFileSync(filePath, file.buffer);

      // Crear registro en BD
      const document = await DocumentRepository.create(
        employeeId,
        file.originalname,
        documentType,
        filePath,
        file.size,
        file.mimetype
      );

      logger.info(`Document uploaded: ${cedula}/${documentType}/${today}/${fileName}`);
      return {
        ...document,
        type: document.documentType,
        name: document.fileName,
      };
    } catch (error) {
      logger.error('Error uploading document', error);
      throw error;
    }
  }

  async getDocumentsByEmployee(employeeId: string): Promise<any[]> {
    try {
      return await DocumentRepository.findByEmployee(employeeId);
    } catch (error) {
      logger.error('Error getting documents by employee', error);
      throw error;
    }
  }

  async getDocumentsByType(type: string): Promise<any[]> {
    try {
      return await DocumentRepository.findByType(type);
    } catch (error) {
      logger.error('Error getting documents by type', error);
      throw error;
    }
  }

  async getDocument(id: string): Promise<any> {
    try {
      return await DocumentRepository.findById(id);
    } catch (error) {
      logger.error('Error getting document', error);
      throw error;
    }
  }

  async getAllDocuments(): Promise<any[]> {
    try {
      return await DocumentRepository.findAll();
    } catch (error) {
      logger.error('Error getting all documents', error);
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const document = await DocumentRepository.findById(id);
      if (document && fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }

      const result = await DocumentRepository.delete(id);
      if (result) {
        logger.info(`Document deleted: ${id}`);
      }
      return result;
    } catch (error) {
      logger.error('Error deleting document', error);
      throw error;
    }
  }

  async downloadDocument(id: string): Promise<{ filePath: string; fileName: string }> {
    try {
      const document = await DocumentRepository.findById(id);
      if (!document) {
        throw new Error('Document not found');
      }

      if (!fs.existsSync(document.filePath)) {
        throw new Error('File not found');
      }

      return {
        filePath: document.filePath,
        fileName: document.fileName,
      };
    } catch (error) {
      logger.error('Error downloading document', error);
      throw error;
    }
  }
}

export default new DocumentService();
