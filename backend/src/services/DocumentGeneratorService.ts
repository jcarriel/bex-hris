import { v4 as uuidv4 } from 'uuid';
import logger from '@utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'memo' | 'acta' | 'finiquito';
  content?: string;
  fileBuffer?: Buffer;
  fileName?: string;
  fileType?: 'text' | 'docx';
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

interface GeneratedDocument {
  id: string;
  templateId: string;
  templateName: string;
  type: string;
  data: Record<string, string>;
  generatedContent: string;
  createdAt: string;
}

// In-memory storage (replace with database in production)
const templates: Map<string, DocumentTemplate> = new Map();
const generatedDocuments: Map<string, GeneratedDocument> = new Map();

class DocumentGeneratorService {
  async createTemplate(templateData: {
    name: string;
    type: 'memo' | 'acta' | 'finiquito';
    content: string;
    variables: string[];
  }): Promise<DocumentTemplate> {
    try {
      const id = uuidv4();
      const template: DocumentTemplate = {
        id,
        ...templateData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      templates.set(id, template);
      logger.info(`Template created: ${id}`);
      return template;
    } catch (error) {
      logger.error('Error creating template', error);
      throw error;
    }
  }

  async getAllTemplates(): Promise<DocumentTemplate[]> {
    try {
      return Array.from(templates.values());
    } catch (error) {
      logger.error('Error getting templates', error);
      throw error;
    }
  }

  async getTemplate(id: string): Promise<DocumentTemplate | null> {
    try {
      return templates.get(id) || null;
    } catch (error) {
      logger.error('Error getting template', error);
      throw error;
    }
  }

  async updateTemplate(
    id: string,
    updateData: Partial<DocumentTemplate>
  ): Promise<DocumentTemplate | null> {
    try {
      const template = templates.get(id);
      if (!template) return null;

      const updated: DocumentTemplate = {
        ...template,
        ...updateData,
        id: template.id,
        createdAt: template.createdAt,
        updatedAt: new Date().toISOString(),
      };
      templates.set(id, updated);
      logger.info(`Template updated: ${id}`);
      return updated;
    } catch (error) {
      logger.error('Error updating template', error);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const deleted = templates.delete(id);
      if (deleted) {
        logger.info(`Template deleted: ${id}`);
      }
      return deleted;
    } catch (error) {
      logger.error('Error deleting template', error);
      throw error;
    }
  }

  private replaceVariables(content: string, data: Record<string, string>): string {
    let result = content;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }

  async createTemplateFromFile(
    name: string,
    type: 'memo' | 'acta' | 'finiquito',
    fileBuffer: Buffer,
    fileName: string,
    variables: string[]
  ): Promise<DocumentTemplate> {
    try {
      const id = uuidv4();
      const template: DocumentTemplate = {
        id,
        name,
        type,
        fileBuffer,
        fileName,
        fileType: fileName.endsWith('.docx') ? 'docx' : 'text',
        variables,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      templates.set(id, template);
      logger.info(`Template created from file: ${id}`);
      return template;
    } catch (error) {
      logger.error('Error creating template from file', error);
      throw error;
    }
  }

  async generateDocument(
    templateId: string,
    data: Record<string, string>
  ): Promise<GeneratedDocument> {
    try {
      const template = templates.get(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      let generatedContent: string;

      if (template.fileType === 'docx' && template.fileBuffer) {
        // For DOCX files, we'll store the buffer and process on download
        generatedContent = Buffer.from(template.fileBuffer).toString('base64');
      } else if (template.content) {
        // For text templates, replace variables
        generatedContent = this.replaceVariables(template.content, data);
      } else {
        throw new Error('Template has no content or file');
      }

      const id = uuidv4();
      const document: GeneratedDocument = {
        id,
        templateId,
        templateName: template.name,
        type: template.type,
        data,
        generatedContent,
        createdAt: new Date().toISOString(),
      };

      generatedDocuments.set(id, document);
      logger.info(`Document generated: ${id}`);
      return document;
    } catch (error) {
      logger.error('Error generating document', error);
      throw error;
    }
  }

  async processDocxWithVariables(
    docxBuffer: Buffer,
    variables: Record<string, string>
  ): Promise<Buffer> {
    try {
      // For now, return the buffer as-is
      // In production, use docx library to process the file
      // Example: const doc = new Document(docxBuffer);
      // Then replace variables in paragraphs and return modified buffer
      return docxBuffer;
    } catch (error) {
      logger.error('Error processing DOCX with variables', error);
      throw error;
    }
  }

  async getAllGeneratedDocuments(): Promise<GeneratedDocument[]> {
    try {
      return Array.from(generatedDocuments.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      logger.error('Error getting generated documents', error);
      throw error;
    }
  }

  async getGeneratedDocument(id: string): Promise<GeneratedDocument | null> {
    try {
      return generatedDocuments.get(id) || null;
    } catch (error) {
      logger.error('Error getting generated document', error);
      throw error;
    }
  }

  async deleteGeneratedDocument(id: string): Promise<boolean> {
    try {
      const deleted = generatedDocuments.delete(id);
      if (deleted) {
        logger.info(`Generated document deleted: ${id}`);
      }
      return deleted;
    } catch (error) {
      logger.error('Error deleting generated document', error);
      throw error;
    }
  }
}

export default new DocumentGeneratorService();
