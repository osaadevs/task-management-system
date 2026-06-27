const ProjectModel = require('../models/projectModel');
const db = require('../config/db');
const { sanitizeText } = require('../utils/sanitize');
const { errorResponse, validationError } = require('../utils/errors');

const ProjectController = {

  getAllProjects: (req, res) => {
    // BE-42: scope the list to the caller (Collaborators see only their projects).
    const filters = { userRole: req.user.role, userId: req.user.id };
    ProjectModel.getAllProjects(filters, (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'PROJECT_FETCH_ERROR', 'Failed to retrieve projects', err.message);
      }
      res.status(200).json({ success: true, data: results });
    });
  },

  getProjectById: (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return errorResponse(res, 400, 'INVALID_PROJECT_ID', 'Invalid project ID', 'Project ID must be a valid number');
    }

    ProjectModel.getProjectById(id, (err, results) => {
      if (err) {
        return errorResponse(res, 500, 'PROJECT_FETCH_ERROR', 'Failed to retrieve project', err.message);
      }
      if (results.length === 0) {
        return errorResponse(res, 404, 'PROJECT_NOT_FOUND', 'Project not found', `No project found with ID ${id}`);
      }

      const isCollaborator = req.user.role === 'Collaborator';
      const isProjectManager = req.user.role === 'Project Manager';
      const project = results[0];

      const respond = () => {
        ProjectModel.getProjectMembers(id, (err2, members) => {
          if (err2) members = [];
          // BE-42/BE-43: don't expose member emails to Collaborators.
          project.members = isCollaborator
            ? (members || []).map(({ email, ...rest }) => rest)
            : members;
          res.status(200).json({ success: true, data: project });
        });
      };

      // Project Managers may only open projects they created.
      if (isProjectManager && Number(project.created_by) !== Number(req.user.id)) {
        return errorResponse(res, 403, 'FORBIDDEN', 'You do not have access to this project');
      }

      // BE-42: a Collaborator may only open a project they created or belong to.
      if (isCollaborator) {
        ProjectModel.isUserInProject(id, req.user.id, (err3, rows) => {
          if (err3) {
            return errorResponse(res, 500, 'PROJECT_FETCH_ERROR', 'Failed to verify project access', err3.message);
          }
          if (!rows.length) {
            return errorResponse(res, 403, 'FORBIDDEN', 'You do not have access to this project');
          }
          respond();
        });
        return;
      }

      respond();
    });
  },

  createProject: (req, res) => {
    const { project_name, description } = req.body || {};

    if (!project_name || !String(project_name).trim()) {
      return validationError(res, [{ field: 'project_name', message: 'Project name is required' }]);
    }

    const projectData = {
      project_name: sanitizeText(String(project_name)), // BE-6
      description: description ? sanitizeText(String(description)) : null, // BE-6
      created_by: req.user.id,
    };

    ProjectModel.createProject(projectData, (err, result) => {
      if (err) {
        return errorResponse(res, 500, 'PROJECT_CREATE_ERROR', 'Failed to create project', err.message);
      }

      const projectId = result.insertId;
      ProjectModel.addProjectMember(projectId, req.user.id, () => {
        res.status(201).json({
          success: true,
          message: 'Project created successfully',
          data: { id: projectId, ...projectData },
        });
      });
    });
  },

  updateProject: async (req, res) => {
    const projectId = Number(req.params.id);
    const body = req.body || {};

    if (!projectId || Number.isNaN(projectId)) {
      return errorResponse(res, 400, 'INVALID_PROJECT_ID', 'Invalid project ID', 'Project ID must be a valid number');
    }

    try {
      const [existingRows] = await db.promise().query(
        'SELECT id, created_by, project_name, description FROM projects WHERE id = ?',
        [projectId]
      );

      if (!existingRows.length) {
        return errorResponse(res, 404, 'PROJECT_NOT_FOUND', 'Project not found');
      }

      const existing = existingRows[0];
      const isAdmin = req.user.role === 'Admin';
      const isOwnerPm =
        req.user.role === 'Project Manager' && Number(existing.created_by) === Number(req.user.id);

      if (!isAdmin && !isOwnerPm) {
        return errorResponse(res, 403, 'FORBIDDEN', 'You do not have permission to update this project');
      }

      const updates = {};

      if (body.project_name !== undefined) {
        const projectName = sanitizeText(String(body.project_name)).trim();
        if (!projectName) {
          return validationError(res, [{ field: 'project_name', message: 'Project name is required' }]);
        }
        updates.project_name = projectName;
      }

      if (body.description !== undefined) {
        updates.description = body.description
          ? sanitizeText(String(body.description))
          : null;
      }

      if (body.created_by !== undefined) {
        if (!isAdmin) {
          return errorResponse(res, 403, 'FORBIDDEN', 'Only an admin can change the project manager');
        }

        const newManagerId = Number(body.created_by);
        if (!newManagerId || Number.isNaN(newManagerId)) {
          return validationError(res, [{ field: 'created_by', message: 'A valid project manager is required' }]);
        }

        const [managerRows] = await db.promise().query(
          `SELECT u.id
           FROM users u
           JOIN roles r ON u.role_id = r.id
           WHERE u.id = ?
             AND u.is_active = TRUE
             AND r.role_name IN ('Admin', 'Project Manager')`,
          [newManagerId]
        );

        if (!managerRows.length) {
          return validationError(res, [
            { field: 'created_by', message: 'Project manager must be an active Admin or Project Manager' },
          ]);
        }

        updates.created_by = newManagerId;
      }

      if (!Object.keys(updates).length) {
        return validationError(res, [{ field: 'body', message: 'No valid fields to update' }]);
      }

      await new Promise((resolve, reject) => {
        ProjectModel.updateProject(projectId, updates, (err, result) => {
          if (err) return reject(err);
          if (!result.affectedRows) {
            const notFound = new Error('Project not found');
            notFound.code = 'NOT_FOUND';
            return reject(notFound);
          }
          resolve();
        });
      });

      if (updates.created_by) {
        await new Promise((resolve, reject) => {
          ProjectModel.addProjectMember(projectId, updates.created_by, (err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        await db.promise().query(
          `UPDATE tasks
           SET created_by = ?, updated_at = CURRENT_TIMESTAMP
           WHERE project_id = ? AND created_by = ?`,
          [updates.created_by, projectId, existing.created_by]
        );
      }

      ProjectModel.getProjectById(projectId, (err, results) => {
        if (err) {
          return errorResponse(res, 500, 'PROJECT_FETCH_ERROR', 'Project updated but failed to reload', err.message);
        }
        res.status(200).json({
          success: true,
          message: 'Project updated successfully',
          data: results[0],
        });
      });
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return errorResponse(res, 404, 'PROJECT_NOT_FOUND', 'Project not found');
      }
      return errorResponse(res, 500, 'PROJECT_UPDATE_ERROR', 'Failed to update project', err.message);
    }
  },

  deleteProject: async (req, res) => {
    const projectId = Number(req.params.id);

    if (!projectId || Number.isNaN(projectId)) {
      return errorResponse(res, 400, 'INVALID_PROJECT_ID', 'Invalid project ID', 'Project ID must be a valid number');
    }

    try {
      const deletedRows = await db.runTransaction(async (query) => {
        const existing = await query(
          'SELECT id, created_by FROM projects WHERE id = ?',
          [projectId]
        );

        if (!existing.rows.length) {
          return null;
        }

        const ownerId = Number(existing.rows[0].created_by);
        const isAdmin = req.user.role === 'Admin';
        const isOwnerPm =
          req.user.role === 'Project Manager' && ownerId === Number(req.user.id);

        if (!isAdmin && !isOwnerPm) {
          const err = new Error('You do not have permission to delete this project');
          err.code = 'FORBIDDEN';
          throw err;
        }

        await query(
          `DELETE FROM attachments
           WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)`,
          [projectId]
        );
        await query(
          `DELETE FROM comments
           WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)`,
          [projectId]
        );
        await query(
          `DELETE FROM task_assignments
           WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)`,
          [projectId]
        );
        await query(
          `DELETE FROM notifications
           WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)
              OR project_id = ?`,
          [projectId, projectId]
        );
        await query('DELETE FROM tasks WHERE project_id = ?', [projectId]);
        await query('DELETE FROM project_members WHERE project_id = ?', [projectId]);

        const deleted = await query('DELETE FROM projects WHERE id = ? RETURNING id', [projectId]);
        return deleted.rows;
      });

      if (!deletedRows?.length) {
        return errorResponse(res, 404, 'PROJECT_NOT_FOUND', 'Project not found', `No project found with ID ${projectId}`);
      }

      res.json({
        success: true,
        message: 'Project deleted permanently',
        deletedId: deletedRows[0].id,
      });
    } catch (err) {
      if (err.code === 'FORBIDDEN') {
        return errorResponse(res, 403, 'FORBIDDEN', err.message);
      }
      if (err.code === '23503') {
        return errorResponse(res, 409, 'DELETE_BLOCKED', 'Project could not be deleted because of linked records');
      }
      console.error('deleteProject failed:', err.message);
      return errorResponse(res, 500, 'PROJECT_DELETE_ERROR', 'Failed to delete project', err.message);
    }
  },

};

module.exports = ProjectController;