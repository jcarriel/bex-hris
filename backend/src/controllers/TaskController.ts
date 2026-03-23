import { Request, Response } from 'express';
import { getDatabase } from '@config/database';
import { TaskRepository } from '@repositories/TaskRepository';
import TaskNotificationService from '@services/TaskNotificationService';
import { v4 as uuidv4 } from 'uuid';

function repo() {
  return new TaskRepository(getDatabase());
}

async function getUserById(id: string) {
  if (!id) return null;
  return getDatabase().get('SELECT id, username, nombre, email FROM users WHERE id = ?', [id]);
}

async function enrichTask(task: any) {
  if (!task) return null;
  const db = getDatabase();
  const [creator, assignee] = await Promise.all([
    task.createdBy ? db.get('SELECT id, username, nombre FROM users WHERE id = ?', [task.createdBy]) : null,
    task.assignedTo ? db.get('SELECT id, username, nombre FROM users WHERE id = ?', [task.assignedTo]) : null,
  ]);
  return {
    ...task,
    creatorName: creator?.nombre || creator?.username || null,
    assigneeName: assignee?.nombre || assignee?.username || null,
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  paused: 'Pausada',
  completed: 'Completada',
  rejected: 'Rechazada',
};

const VALID_STATUSES = ['pending', 'in_progress', 'paused', 'completed', 'rejected'];

// Transitions allowed per role
// assignee: can start, pause, resume, complete, reject
// creator:  no status changes (only delete)
// admin:    any transition (treated as assignee rules)
const ASSIGNEE_ALLOWED: Record<string, string[]> = {
  pending:     ['in_progress', 'rejected'],
  in_progress: ['paused', 'completed'],
  paused:      ['in_progress', 'completed'],
  completed:   ['pending'],
  rejected:    ['pending'],
};

class TaskController {
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const { status, assignedTo, createdBy } = req.query;
      let query = `
        SELECT t.*,
          uc.nombre as creatorName, uc.username as creatorUsername,
          ua.nombre as assigneeName, ua.username as assigneeUsername
        FROM tasks t
        LEFT JOIN users uc ON t.createdBy = uc.id
        LEFT JOIN users ua ON t.assignedTo = ua.id
        WHERE 1=1
      `;
      const params: any[] = [];
      if (status) { query += ` AND t.status = ?`; params.push(status); }
      if (assignedTo) { query += ` AND t.assignedTo = ?`; params.push(assignedTo); }
      if (createdBy) { query += ` AND t.createdBy = ?`; params.push(createdBy); }
      query += ` ORDER BY t.dueDate ASC, t.createdAt DESC`;
      const tasks = await db.all(query, params);
      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching tasks' });
    }
  }

  async getMyTasks(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
      const db = getDatabase();
      const tasks = await db.all(`
        SELECT t.*,
          uc.nombre as creatorName, uc.username as creatorUsername,
          ua.nombre as assigneeName, ua.username as assigneeUsername
        FROM tasks t
        LEFT JOIN users uc ON t.createdBy = uc.id
        LEFT JOIN users ua ON t.assignedTo = ua.id
        WHERE t.assignedTo = ? OR t.createdBy = ?
        ORDER BY t.dueDate ASC, t.createdAt DESC
      `, [userId, userId]);
      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching tasks' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const task = await repo().getById(req.params.id);
      if (!task) { res.status(404).json({ success: false, message: 'Task not found' }); return; }
      res.json({ success: true, data: await enrichTask(task) });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching task' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const taskData = { ...req.body, createdBy: userId, status: 'pending' };
      const task = await repo().create(taskData);
      if (task) {
        const creator = await getUserById(userId);
        await addComment(task.id, userId, creator?.nombre || creator?.username || 'Sistema', 'Tarea creada', 'created');
        try { await TaskNotificationService.notifyTaskCreated(task, creator); } catch {}
      }
      res.status(201).json({ success: true, data: await enrichTask(task) });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error creating task' });
    }
  }

  // Editing is disabled after creation — endpoint blocked
  async update(req: Request, res: Response): Promise<void> {
    res.status(403).json({ success: false, message: 'Las tareas no pueden editarse una vez creadas' });
  }

  async changeStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { status, comment } = req.body;

      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ success: false, message: 'Estado inválido' }); return;
      }

      const existing = await repo().getById(req.params.id);
      if (!existing) { res.status(404).json({ success: false, message: 'Tarea no encontrada' }); return; }

      const isAssignee = existing.assignedTo === userId;
      const isAdmin    = (req as any).user?.role === 'admin' || (req as any).user?.rol === 'admin';

      // Only assignee (or admin) can change status
      if (!isAssignee && !isAdmin) {
        res.status(403).json({ success: false, message: 'Solo el asignado puede cambiar el estado de la tarea' }); return;
      }

      // Validate the transition is allowed
      const allowed = ASSIGNEE_ALLOWED[existing.status] ?? [];
      if (!allowed.includes(status)) {
        res.status(400).json({
          success: false,
          message: `No se puede cambiar de "${STATUS_LABELS[existing.status]}" a "${STATUS_LABELS[status]}"`,
        }); return;
      }

      const updateData: any = { status };
      if (status === 'completed') {
        updateData.completedAt = new Date().toISOString();
        if (comment) updateData.completionNotes = comment;
      }

      const task = await repo().update(req.params.id, updateData);
      const user = await getUserById(userId);
      const userName = user?.nombre || user?.username || 'Sistema';

      await addComment(
        task.id, userId, userName,
        comment || `Estado cambiado a "${STATUS_LABELS[status] ?? status}"`,
        'status_change',
      );

      if (status === 'rejected') {
        try { await TaskNotificationService.notifyTaskRejected(task, user); } catch {}
      } else {
        try { await TaskNotificationService.notifyStatusChanged(task, user, existing.status); } catch {}
      }

      res.json({ success: true, data: await enrichTask(task) });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error cambiando estado' });
    }
  }

  async reassign(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { assignedTo } = req.body;

      const existing = await repo().getById(req.params.id);
      if (!existing) { res.status(404).json({ success: false, message: 'Tarea no encontrada' }); return; }

      const isCreator = existing.createdBy === userId;
      const isAdmin   = (req as any).user?.role === 'admin' || (req as any).user?.rol === 'admin';

      if (!isCreator && !isAdmin) {
        res.status(403).json({ success: false, message: 'Solo el creador puede reasignar la tarea' }); return;
      }

      const oldAssigneeId = existing.assignedTo;
      const task = await repo().update(req.params.id, { assignedTo, status: 'pending' });
      const user = await getUserById(userId);
      const newAssignee = await getUserById(assignedTo);

      await addComment(
        task.id, userId, user?.nombre || user?.username || 'Sistema',
        `Reasignada a ${newAssignee?.nombre || newAssignee?.username || assignedTo}`,
        'reassign',
      );
      try { await TaskNotificationService.notifyTaskReassigned(task, user, oldAssigneeId); } catch {}

      res.json({ success: true, data: await enrichTask(task) });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error reasignando tarea' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const existing = await repo().getById(req.params.id);
      if (!existing) { res.status(404).json({ success: false, message: 'Tarea no encontrada' }); return; }

      const isCreator = existing.createdBy === userId;
      const isAdmin   = (req as any).user?.role === 'admin' || (req as any).user?.rol === 'admin';

      if (!isCreator && !isAdmin) {
        res.status(403).json({ success: false, message: 'Solo el creador puede eliminar la tarea' }); return;
      }

      const ok = await repo().delete(req.params.id);
      if (ok) {
        const user = await getUserById(userId);
        try { await TaskNotificationService.notifyTaskDeleted(existing, user); } catch {}
      }
      res.json({ success: true, message: 'Tarea eliminada' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error eliminando tarea' });
    }
  }

  async getComments(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const comments = await db.all(
        `SELECT * FROM task_comments WHERE taskId = ? ORDER BY createdAt ASC`,
        [req.params.id],
      );
      res.json({ success: true, data: comments });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching comments' });
    }
  }

  async addComment(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { comment } = req.body;
      if (!comment?.trim()) { res.status(400).json({ success: false, message: 'Comentario requerido' }); return; }
      const task = await repo().getById(req.params.id);
      if (!task) { res.status(404).json({ success: false, message: 'Tarea no encontrada' }); return; }
      if (task.status === 'pending' || task.status === 'rejected') {
        res.status(403).json({ success: false, message: 'No se pueden agregar comentarios a tareas que no han sido iniciadas' }); return;
      }
      const user = await getUserById(userId);
      const c = await addComment(req.params.id, userId, user?.nombre || user?.username || 'Sistema', comment.trim(), 'comment');
      res.status(201).json({ success: true, data: c });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error agregando comentario' });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const userId = (req as any).user?.id;
      const all = await db.all(`SELECT status FROM tasks WHERE assignedTo = ? OR createdBy = ?`, [userId, userId]);
      const stats = { total: all.length, pending: 0, in_progress: 0, paused: 0, completed: 0, rejected: 0 };
      for (const t of all as any[]) {
        if (t.status in stats) (stats as any)[t.status]++;
      }
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching stats' });
    }
  }
}

async function addComment(taskId: string, userId: string, userName: string, comment: string, action?: string) {
  const db = getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.run(
    `INSERT INTO task_comments (id, taskId, userId, userName, comment, action, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, taskId, userId, userName, comment, action || null, now],
  );
  return db.get(`SELECT * FROM task_comments WHERE id = ?`, [id]);
}

export default new TaskController();
