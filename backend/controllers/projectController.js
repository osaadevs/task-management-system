const ProjectModel = require('../models/projectModel');

const errorResponse = (res, statusCode, errorCode, message, description = null) => {
  return res.status(statusCode).json({
    errorCode,
    message,
    description
  });
};

const ProjectController = {

  getAllProjects: (req, res) => {
    ProjectModel.getAllProjects((err, results) => {
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

      ProjectModel.getProjectMembers(id, (err2, members) => {
        if (err2) members = [];
        const project = results[0];
        project.members = members;
        res.status(200).json({ success: true, data: project });
      });
    });
  },

  createProject: (req, res) => {
    const { project_name, description } = req.body;

    if (!project_name || !String(project_name).trim()) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Project name is required');
    }

    const projectData = {
      project_name: String(project_name).trim(),
      description: description ? String(description).trim() : null,
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