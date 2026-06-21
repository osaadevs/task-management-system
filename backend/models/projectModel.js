const db = require('../config/db');

const ProjectModel = {

  getAllProjects: (callback) => {
    const sql = `SELECT projects.*, users.full_name as created_by_name 
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
  }

};

module.exports = ProjectModel;