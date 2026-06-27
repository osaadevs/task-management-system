const TaskModel = require('../models/taskModel');
const { errorResponse, validationError } = require('../utils/errors');
const { sanitizeText } = require('../utils/sanitize');
const { notifyUsers } = require('../services/notificationService');
const socketService = require('../services/socketService');

const VALID_PRIORITIES = ['Low', 'Medium', 'High'];
const VALID_STATUSES = ['To Do', 'In Progress', 'Completed'];

function validateDueDate(dueDate) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) {
    return 'Due date is invalid'; // BE-13: reject malformed dates ("garbage")
  }
  if (due < today) {
    return 'Due date cannot be in the past';
  }
  return null;
}

function getAssigneeIdsAsync(taskId) {
  return new Promise((resolve, reject) => {
    TaskModel.getAssigneeIds(taskId, (err, rows) => {
      if (err) return reject(err);
      resolve((rows || []).map((row) => Number(row.user_id)));
    });
  });
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

function recipientsExcept(actorId, userIds = []) {
  const actor = Number(actorId);
  return [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id !== actor))];
}

// BE-9: resolve which requested assignee ids are not valid active users.
// Resolves { badFormat, invalid[] }; rejects only on a DB error.
function checkAssignees(assigneeIds) {
  return new Promise((resolve, reject) => {
    const numeric = assigneeIds.map((x) => Number(x));
    if (numeric.some((n) => !Number.isInteger(n) || n <= 0)) {
      return resolve({ badFormat: true, invalid: [] });
    }
    TaskModel.findActiveUserIds(numeric, (err, rows) => {
      if (err) return reject(err);
      const validSet = new Set((rows || []).map((r) => Number(r.id)));
      const invalid = [...new Set(numeric.filter((id) => !validSet.has(id)))];
      resolve({ badFormat: false, invalid });
    });
  });
}

// BE-9: returns an error response and true if assignee_ids are invalid, else false.
// `alreadyAssignedIds` (the task's current assignees) are exempt from the active-user
// check, so a previously-assigned member who was later deactivated does not block an
// Admin/PM from editing the task — only genuinely NEW assignees must be active users.
async function rejectInvalidAssignees(res, assignee_ids, errorCode, alreadyAssignedIds = []) {
  if (assignee_ids === undefined) return false;
  if (!Array.isArray(assignee_ids)) {
    validationError(res, [{ field: 'assignee_ids', message: 'assignee_ids must be an array' }]);
    return true;
  }

  const already = new Set((alreadyAssignedIds || []).map(Number));
  const newIds = assignee_ids.map(Number).filter((id) => !already.has(id));
  if (!newIds.length) return false;

  let check;
  try {
    check = await checkAssignees(newIds);
  } catch (err) {
    errorResponse(res, 500, errorCode, 'Failed to validate assignees', err.message);
    return true;
  }
  if (check.badFormat) {
    validationError(res, [{ field: 'assignee_ids', message: 'assignee_ids must be positive integers' }]);
    return true;
  }
  if (check.invalid.length) {
    validationError(res, [
      { field: 'assignee_ids', message: `Unknown or inactive assignees: ${check.invalid.join(', ')}` },
    ]);
    return true;
  }
  return false;
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
      return validationError(res, [{ field: 'title', message: 'Title is required' }]);
    }

    if (!project_id) {
      return validationError(res, [{ field: 'project_id', message: 'Project is required' }]);
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return validationError(res, [{ field: 'priority', message: 'Invalid priority value' }]);
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return validationError(res, [{ field: 'status', message: 'Invalid status value' }]);
    }

    const dueDateError = validateDueDate(due_date);
    if (dueDateError) {
      return validationError(res, [{ field: 'due_date', message: dueDateError }]);
    }

    // BE-9: reject unknown/inactive assignees up front (no task is created).
    if (await rejectInvalidAssignees(res, assignee_ids, 'TASK_CREATE_ERROR')) return;

    const taskData = {
      title: sanitizeText(title), // BE-6
      description: sanitizeText(description), // BE-6
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
          const recipients = recipientsExcept(req.user.id, assignee_ids);
          if (recipients.length) {
            await notifyUsers(
              recipients,
              'New task assigned',
              `You were assigned to "${title}"`,
              'assignment',
              { emitTaskUpdate: true, taskId, projectId: Number(project_id) }
            );
          } else {
            socketService.emitTaskUpdated(taskId);
          }
        } else {
          socketService.emitTaskUpdated(taskId);
        }
      } catch (notifyErr) {
        console.error('Task create notification error:', notifyErr.message);
        socketService.emitTaskUpdated(taskId);
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
          return validationError(res, [{ field: 'status', message: 'Valid status is required' }]);
        }

        TaskModel.updateTaskStatus(id, status, async (updateErr, result) => {
          if (updateErr) {
            return errorResponse(res, 500, 'TASK_UPDATE_ERROR', 'Failed to update task', updateErr.message);
          }
          if (result.affectedRows === 0) {
            return errorResponse(res, 404, 'TASK_NOT_FOUND', 'Task not found');
          }

          try {
            const assignees = await getAssigneeIdsAsync(id);
            await notifyUsers(
              recipientsExcept(req.user.id, assignees),
              'Task status updated',
              `"${existing.title}" is now "${status}"`,
              'status_change',
              { emitTaskUpdate: true, taskId: Number(id) }
            );
          } catch (notifyErr) {
            console.error('Status update notification error:', notifyErr.message);
            socketService.emitTaskUpdated(Number(id));
          }

          return res.status(200).json({ success: true, message: 'Task status updated successfully' });
        });
        return;
      }

      if (!title) {
        return validationError(res, [{ field: 'title', message: 'Title is required' }]);
      }

      if (priority && !VALID_PRIORITIES.includes(priority)) {
        return validationError(res, [{ field: 'priority', message: 'Invalid priority value' }]);
      }

      if (status && !VALID_STATUSES.includes(status)) {
        return validationError(res, [{ field: 'status', message: 'Invalid status value' }]);
      }

      const dueDateError = validateDueDate(due_date);
      if (dueDateError) {
        return validationError(res, [{ field: 'due_date', message: dueDateError }]);
      }

      // BE-9: validate only newly-added assignees (existing ones may have since been
      // deactivated and are re-submitted by the UI — they must not block the update).
      const previousAssigneeIds = await getAssigneeIdsAsync(id);
      if (await rejectInvalidAssignees(res, assignee_ids, 'TASK_UPDATE_ERROR', previousAssigneeIds)) return;

      const taskData = {
        title: sanitizeText(title), // BE-6
        description: sanitizeText(description), // BE-6
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

            const newlyAssigned = recipientsExcept(
              req.user.id,
              assignee_ids.filter((userId) => !previousAssigneeIds.includes(Number(userId)))
            );
            const statusChanged = status && status !== existing.status;

            if (newlyAssigned.length) {
              await notifyUsers(
                newlyAssigned,
                'New task assigned',
                `You were assigned to "${title}"`,
                'assignment',
                {
                  emitTaskUpdate: true,
                  taskId: Number(id),
                  projectId: Number(existing.project_id),
                }
              );
            }

            if (statusChanged) {
              const assignees = await getAssigneeIdsAsync(id);
              await notifyUsers(
                recipientsExcept(req.user.id, assignees),
                'Task status updated',
                `"${title}" is now "${status}"`,
                'status_change',
                { emitTaskUpdate: true, taskId: Number(id) }
              );
            } else if (!newlyAssigned.length) {
              socketService.emitTaskUpdated(Number(id));
            }
          } else if (status && status !== existing.status) {
            const assignees = await getAssigneeIdsAsync(id);
            await notifyUsers(
              recipientsExcept(req.user.id, assignees),
              'Task status updated',
              `"${title}" is now "${status}"`,
              'status_change',
              { emitTaskUpdate: true, taskId: Number(id) }
            );
          } else {
            socketService.emitTaskUpdated(Number(id));
          }
        } catch (notifyErr) {
          console.error('Task update notification error:', notifyErr.message);
          socketService.emitTaskUpdated(Number(id));
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
      socketService.emitTaskUpdated(Number(id));
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    });
  },
};

module.exports = TaskController;
