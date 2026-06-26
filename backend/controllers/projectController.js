const ProjectModel = require('../models/projectModel');
const { sanitizeText } = require('../utils/sanitize');

const errorResponse = (res, statusCode, errorCode, message, description = null) => {
  return res.status(statusCode).json({
    errorCode,
    message,
    description
  });
};

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

      const respond = () => {
        ProjectModel.getProjectMembers(id, (err2, members) => {
          if (err2) members = [];
          const project = results[0];
          // BE-42/BE-43: don't expose member emails to Collaborators.
          project.members = isCollaborator
            ? (members || []).map(({ email, ...rest }) => rest)
            : members;
          res.status(200).json({ success: true, data: project });
        });
      };

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
    const { project_name, description } = req.body;

    if (!project_name || !String(project_name).trim()) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Project name is required');
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

};

module.exports = ProjectController;