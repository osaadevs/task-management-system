const db = require('../config/db');

const ProjectModel = {

  getAllProjects: (callback) => {
    const sql = `SELECT projects.*, users.full_name as created_by_name,
                 (SELECT COUNT(*)::int FROM tasks WHERE tasks.project_id = projects.id) AS task_count,
                 (SELECT COUNT(*)::int FROM tasks WHERE tasks.project_id = projects.id AND tasks.status = 'Completed') AS completed_count
                 FROM projects 
                 JOIN users ON projects.created_by = users.id
                 ORDER BY projects.created_at DESC`;
    db.query(sql, callback);
  },

  getProjectById: (id, callback) => {
    const sql = `SELECT projects.*, users.full_name as created_by_name 
                 FROM projects 
                 JOIN users ON projects.created_by = users.id
                 WHERE projects.id = ?`;
    db.query(sql, [id], callback);
  },

  getProjectMembers: (project_id, callback) => {
    const sql = `SELECT users.id, users.full_name, users.email 
                 FROM project_members 
                 JOIN users ON project_members.user_id = users.id 
                 WHERE project_members.project_id = ?`;
    db.query(sql, [project_id], callback);
  },

  createProject: (projectData, callback) => {
    const sql = `INSERT INTO projects (project_name, description, created_by, status, updated_at)
                 VALUES (?, ?, ?, 'Active', CURRENT_TIMESTAMP)
                 RETURNING id`;
    const values = [
      projectData.project_name,
      projectData.description || null,
      projectData.created_by,
    ];
    db.query(sql, values, callback);
  },

  addProjectMember: (projectId, userId, callback) => {
    const sql = `INSERT INTO project_members (project_id, user_id)
                 VALUES (?, ?)
                 ON CONFLICT (project_id, user_id) DO NOTHING`;
    db.query(sql, [projectId, userId], callback);
  },

};

module.exports = ProjectModel;