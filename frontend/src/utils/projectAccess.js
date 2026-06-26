export function canDeleteProject(user, role, project) {
  if (!project || !user) return false;
  if (role === 'Admin') return true;
  if (role === 'Project Manager') {
    return Number(project.created_by) === Number(user.id);
  }
  return false;
}
