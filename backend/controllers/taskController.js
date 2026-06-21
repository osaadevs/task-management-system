const TaskModel = require('../models/taskModel');
const { errorResponse } = require('../utils/errors');
const { notifyUsers } = require('../services/notificationService');
const { emitTaskUpdated } = require('../services/socketService');

const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['To Do', 'In Progress', 'Completed'];

function validateDueDate(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  if (due < today) {
    return 'Due date cannot be in the past';
  }
  return null;
}

async function syncAssignments(taskId, assigneeIds = []) {
  await new Promise((resolve, reject) => {
    TaskModel.clearAssignments(taskId, (err) => (err ? reject(err) : resolve()));
  });

  for (const userId of assigneeIds) {
    await new Promise((resolve, reject) => {
      TaskModel.assignTask(taskId, userId, (err) => (err ? reject(err) : resolve()));
    });
  }
}

const TaskController = {
  getAllTasks: (req, res) => {
    const filters = {
      status: req.query.status || null,
      priority: req.query.priority || null,
      assigned_to: req.query.assigned_to || null,
      project_id: req.query.project_id || null,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'desc',
      userRole: req.user.role,
      userId: req.user.id,
    };

    TaskModel.getAllTasks(filters, (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_FETCH_ERROR', 'Failed to retrieve tasks', err.message);
      }
      res.status(200).json({ success: true, data: results });
    });
  },

  getTaskById: (req, res) => {
    const { id } = req.params;

    if (!id || Number.isNaN(Number(id))) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID');
    }

    TaskModel.getTaskById(id, async (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_FETCH_ERROR', 'Failed to retrieve task', err.message);
      }
      if (results.length === 0) {
        return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found');
      }

      const task = results[0];
      if (req.user.role === 'Collaborator' && task.created_by !== req.user.id) {
        const assigned = await new Promise((resolve) => {
          TaskModel.isUserAssigned(id, req.user.id, (assignErr, rows) => {
            resolve(!assignErr && rows.length > 0);
          });
        });
        if (!assigned) {
          return errorResponse(res, 403, 'FORBIDDEN', 'You can only view tasks assigned to you');
        }
      }

      res.status(200).json({ success: true, data: task });
    });
  },

  createTask: async (req, res) => {
    const { title, description, project_id, due_date, priority, status, assignee_ids } = req.body;

    if (!title) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Title is required');
    }

    if (!project_id) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Project is required');
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid priority value');
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid status value');
    }

    const dueDateError = validateDueDate(due_date);
    if (dueDateError) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', dueDateError);
    }

    const taskData = {
      title,
      description,
      project_id,
      due_date,
      priority: priority || 'Medium',
      status: status || 'To Do',
      created_by: req.user.id,
    };

    TaskModel.createTask(taskData, async (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_CREATE_ERROR', 'Failed to create task', err.message);
      }

      const taskId = result.insertId;

      try {
        if (Array.isArray(assignee_ids) && assignee_ids.length) {
          await syncAssignments(taskId, assignee_ids);
          await notifyUsers(
            assignee_ids,
            'New task assigned',
            `You were assigned to "${title}"`,
            'assignment',
            { emitTaskUpdate: true, taskId }
          );
        } else {
          emitTaskUpdated(taskId);
        }
      } catch (notifyErr) {
        console.error('Task create notification error:', notifyErr.message);
      }

      res.status(201).json({ success: true, message: 'Task created successfully', taskId });
    });
  },

  updateTask: async (req, res) => {
    const { id } = req.params;
    const { title, description, due_date, priority, status, assignee_ids } = req.body;

    if (!id || Number.isNaN(Number(id))) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID');
    }

    TaskModel.getTaskById(id, async (err, existingRows) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_FETCH_ERROR', 'Failed to retrieve task', err.message);
      }
      if (existingRows.length === 0) {
        return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found');
      }

      const existing = existingRows[0];

      if (req.user.role === 'Collaborator') {
        const assigned = await new Promise((resolve) => {
          TaskModel.isUserAssigned(id, req.user.id, (assignErr, rows) => {
            resolve(!assignErr && rows.length > 0);
          });
        });

        if (!assigned) {
          return errorResponse(res, 403, 'FORBIDDEN', 'You can only update tasks assigned to you');
        }

        if (!status || !VALID_STATUSES.includes(status)) {
          return errorResponse(res, 400, 'VALIDATION_ERROR', 'Valid status is required');
        }

        TaskModel.updateTaskStatus(id, status, async (updateErr, result) => {
          if (updateErr) {
            return errorResponse(res, 500, 'TASK_UPDATE_ERROR', 'Failed to update task', updateErr.message);
          }
          if (result.affectedRows === 0) {
            return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found');
          }

          try {
            TaskModel.getAssigneeIds(id, async (_, assignees) => {
              const ids = (assignees || []).map((row) => row.user_id);
              await notifyUsers(
                ids.filter((userId) => userId !== req.user.id),
                'Task status updated',
                `"${existing.title}" is now "${status}"`,
                'status_change',
                { emitTaskUpdate: true, taskId: Number(id) }
              );
              emitTaskUpdated(Number(id));
            });
          } catch (notifyErr) {
            console.error('Status update notification error:', notifyErr.message);
          }

          return res.status(200).json({ success: true, message: 'Task status updated successfully' });
        });
        return;
      }

      if (!title) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'Title is required');
      }

      if (priority && !VALID_PRIORITIES.includes(priority)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid priority value');
      }

      if (status && !VALID_STATUSES.includes(status)) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid status value');
      }

      const dueDateError = validateDueDate(due_date);
      if (dueDateError) {
        return errorResponse(res, 400, 'VALIDATION_ERROR', dueDateError);
      }

      const taskData = {
        title,
        description,
        due_date,
        priority: priority || existing.priority,
        status: status || existing.status,
      };

      TaskModel.updateTask(id, taskData, async (updateErr, result) => {
        if (updateErr) {
          return errorResponse(res, 500, 'TASK_UPDATE_ERROR', 'Failed to update task', updateErr.message);
        }
        if (result.affectedRows === 0) {
          return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found');
        }

        try {
          if (Array.isArray(assignee_ids)) {
            await syncAssignments(id, assignee_ids);
          }

          TaskModel.getAssigneeIds(id, async (_, assignees) => {
            const ids = (assignees || []).map((row) => row.user_id);
            if (status && status !== existing.status) {
              await notifyUsers(
                ids.filter((userId) => userId !== req.user.id),
                'Task status updated',
                `"${title}" is now "${status}"`,
                'status_change',
                { emitTaskUpdate: true, taskId: Number(id) }
              );
            } else {
              emitTaskUpdated(Number(id));
            }
          });
        } catch (notifyErr) {
          console.error('Task update notification error:', notifyErr.message);
        }

        res.status(200).json({ success: true, message: 'Task updated successfully' });
      });
    });
  },

  deleteTask: (req, res) => {
    const { id } = req.params;

    if (!id || Number.isNaN(Number(id))) {
      return errorResponse(res, 400, 'INVALID_TASK_ID', 'Invalid task ID');
    }

    TaskModel.deleteTask(id, (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'TASK_DELETE_ERROR', 'Failed to delete task', err.message);
      }
      if (result.affectedRows === 0) {
        return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found');
      }
      emitTaskUpdated(Number(id));
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    });
  },
};

module.exports = TaskController;
