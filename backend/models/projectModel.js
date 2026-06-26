const db = require('../config/db');

const ProjectModel = {

  // BE-42: Collaborators only see projects they created or are members of.
  // Admin/PM (no filters or non-Collaborator role) see all projects.
  getAllProjects: (filters, callback) => {
    if (typeof filters === 'function') {
      callback = filters;
      filters = {};
    }

    let sql = `SELECT projects.*, users.full_name as created_by_name,
                 (SELECT COUNT(*)::int FROM tasks WHERE tasks.project_id = projects.id) AS task_count,
                 (SELECT COUNT(*)::int FROM tasks WHERE tasks.project_id = projects.id AND tasks.status = 'Completed') AS completed_count
                 FROM projects
                 JOIN users ON projects.created_by = users.id`;
    const values = [];

    if (filters.userRole === 'Collaborator') {
      // BE-42: a Collaborator's projects = ones they created, are a member of, OR are
      // assigned a task in (mirrors the creator-or-assignee rule used for task access,
      // so assignment-notification deep links resolve instead of 403-ing).
      sql += ` WHERE (
                 projects.created_by = ?
                 OR EXISTS (
                   SELECT 1 FROM project_members pm
                   WHERE pm.project_id = projects.id AND pm.user_id = ?
                 )
                 OR EXISTS (
                   SELECT 1 FROM tasks t
                   JOIN task_assignments ta ON ta.task_id = t.id
                   WHERE t.project_id = projects.id AND ta.user_id = ?
                 )
               )`;
      values.push(filters.userId, filters.userId, filters.userId);
    }

    sql += ` ORDER BY projects.created_at DESC`;
    db.query(sql, values, callback);
  },

  getProjectById: (id, callback) => {
    const sql = `SELECT projects.*, users.full_name as created_by_name
                 FROM projects
                 JOIN users ON projects.created_by = users.id
                 WHERE projects.id = ?`;
    db.query(sql, [id], callback);
  },

  // BE-42: membership check used to scope project detail for Collaborators.
  isUserInProject: (projectId, userId, callback) => {
    // BE-42: creator OR member OR assignee of a task in the project (see getAllProjects).
    const sql = `SELECT 1
                 FROM projects p
                 WHERE p.id = ? AND (
                   p.created_by = ?
                   OR EXISTS (
                     SELECT 1 FROM project_members pm
                     WHERE pm.project_id = p.id AND pm.user_id = ?
                   )
                   OR EXISTS (
                     SELECT 1 FROM tasks t
                     JOIN task_assignments ta ON ta.task_id = t.id
                     WHERE t.project_id = p.id AND ta.user_id = ?
                   )
                 )
                 LIMIT 1`;
    db.query(sql, [projectId, userId, userId, userId], callback);
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