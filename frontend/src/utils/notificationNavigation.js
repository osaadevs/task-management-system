export function getTaskPath(notification) {
  const taskId = notification?.task_id;
  const projectId = notification?.project_id;
  if (!taskId || !projectId) return null;
  return `/projects/${projectId}?task=${taskId}`;
}

export function canOpenTask(notification) {
  return Boolean(notification?.task_id && notification?.project_id);
}
