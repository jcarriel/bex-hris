import { Request, Response } from 'express';
import SocialCaseRepository from '@repositories/SocialCaseRepository';

interface AuthRequest extends Request {
  userId?: string;
}

class SocialCaseController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const cases = await SocialCaseRepository.getAll();
      res.json({ success: true, data: cases });
    } catch (e) {
      res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Error' });
    }
  }

  async getByEmployee(req: AuthRequest, res: Response) {
    try {
      const cases = await SocialCaseRepository.findByEmployee(req.params.employeeId);
      res.json({ success: true, data: cases });
    } catch (e) {
      res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Error' });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const sc = await SocialCaseRepository.create({ ...req.body, createdBy: req.userId || '' });
      res.status(201).json({ success: true, data: sc });
    } catch (e) {
      res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Error' });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const sc = await SocialCaseRepository.update(req.params.id, req.body);
      if (!sc) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true, data: sc });
    } catch (e) {
      res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Error' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const ok = await SocialCaseRepository.delete(req.params.id);
      if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ success: false, message: e instanceof Error ? e.message : 'Error' });
    }
  }
}

export default new SocialCaseController();
