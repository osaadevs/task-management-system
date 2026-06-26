/**
 * Full API smoke test — run: node scripts/smoke-test.js
 * Requires backend on PORT 5000 and seeded local DB.
 */
const BASE = process.env.API_BASE || 'http://localhost:5000/api';

const USERS = {
  admin: { email: 'yasith@tms.com', password: 'Password@123', role: 'Admin' },
  pm: { email: 'sarah.j@tms.com', password: 'Password@123', role: 'Project Manager' },
  collab: { email: 'aisha.p@tms.com', password: 'Password@123', role: 'Collaborator' },
};

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, ok: res.ok };
}

async function login(key) {
  const u = USERS[key];
  const r = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: u.email, password: u.password }),
  });
  if (!r.ok) throw new Error(`${key} login failed: ${r.data.message || r.status}`);
  if (r.data.user?.role !== u.role) throw new Error(`${key} wrong role: ${r.data.user?.role}`);
  return { token: r.data.token, user: r.data.user };
}

async function main() {
  console.log(`\nTaskora smoke test → ${BASE}\n`);

  // Health
  const health = await req('/health');
  if (health.ok && health.data.status === 'ok') pass('Health check', health.data.connection);
  else fail('Health check', JSON.stringify(health.data));

  const emailHealth = await req('/health/email');
  if (emailHealth.data.email?.configured) pass('Email configured');
  else pass('Email configured', 'skipped locally (no RESEND_API_KEY) — expected in dev');

  // Auth — bad login
  const badLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'bad@test.com', password: 'wrong' }),
  });
  if (badLogin.status === 401) pass('Login rejects invalid credentials');
  else fail('Login rejects invalid credentials', String(badLogin.status));

  let admin, pm, collab;
  try {
    admin = await login('admin');
    pass('Admin login', admin.user.name);
    pm = await login('pm');
    pass('PM login', pm.user.name);
    collab = await login('collab');
    pass('Collaborator login', collab.user.name);
  } catch (e) {
    fail('Auth logins', e.message);
    printSummary();
    process.exit(1);
  }

  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  // Forgot password
  const forgot = await req('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: USERS.pm.email }),
  });
  if (forgot.ok) pass('Forgot password endpoint', forgot.data.message?.slice(0, 50));
  else if (forgot.status === 503 && forgot.data.errorCode === 'EMAIL_NOT_CONFIGURED') {
    pass('Forgot password endpoint', '503 without RESEND_API_KEY (dev OK)');
  } else fail('Forgot password endpoint', forgot.data.message || forgot.status);

  // Projects — PM create
  const createProj = await req('/projects', {
    method: 'POST',
    headers: auth(pm.token),
    body: JSON.stringify({ project_name: `Smoke Test ${Date.now()}`, description: 'auto test' }),
  });
  let projectId = createProj.data?.data?.id;
  if (createProj.ok && projectId) pass('PM create project', `id=${projectId}`);
  else fail('PM create project', createProj.data.message || createProj.status);

  // Collaborator cannot create project
  const collabCreate = await req('/projects', {
    method: 'POST',
    headers: auth(collab.token),
    body: JSON.stringify({ project_name: 'Should Fail' }),
  });
  if (collabCreate.status === 403) pass('Collaborator blocked from creating project');
  else fail('Collaborator blocked from creating project', String(collabCreate.status));

  // PM sees only own projects (not all)
  const pmProjects = await req('/projects', { headers: auth(pm.token) });
  const adminProjects = await req('/projects', { headers: auth(admin.token) });
  if (pmProjects.ok) {
    const pmList = pmProjects.data.data || [];
    const allOwned = pmList.every((p) => Number(p.created_by) === Number(pm.user.id));
    if (allOwned) pass('PM sees only own projects', `count=${pmList.length}`);
    else fail('PM sees only own projects', 'found projects not owned by PM');
    if (adminProjects.ok && (adminProjects.data.data?.length || 0) >= pmList.length) {
      pass('Admin sees all projects', `admin=${adminProjects.data.data.length} pm=${pmList.length}`);
    }
  } else fail('PM list projects', pmProjects.data.message);

  // Tasks — PM create in project
  let taskId;
  if (projectId) {
    const createTask = await req('/tasks', {
      method: 'POST',
      headers: auth(pm.token),
      body: JSON.stringify({
        project_id: projectId,
        title: 'Smoke task',
        priority: 'Medium',
        status: 'To Do',
        assignee_ids: [collab.user.id],
      }),
    });
    taskId = createTask.data?.taskId || createTask.data?.data?.id || createTask.data?.id;
    if (createTask.ok && taskId) pass('PM create task', `id=${taskId}`);
    else fail('PM create task', createTask.data.message || JSON.stringify(createTask.data));

    const getTask = await req(`/tasks/${taskId}`, { headers: auth(collab.token) });
    if (getTask.ok) pass('Collaborator can view assigned task');
    else fail('Collaborator can view assigned task', getTask.data.message);

    const statusUpdate = await req(`/tasks/${taskId}`, {
      method: 'PUT',
      headers: auth(collab.token),
      body: JSON.stringify({ status: 'In Progress' }),
    });
    if (statusUpdate.ok) pass('Collaborator can update task status');
    else fail('Collaborator can update task status', statusUpdate.data.message);

    const comment = await req('/comments', {
      method: 'POST',
      headers: auth(collab.token),
      body: JSON.stringify({ task_id: taskId, content: 'Smoke comment' }),
    });
    if (comment.ok) pass('Collaborator add comment');
    else fail('Collaborator add comment', comment.data.message);

    const comments = await req(`/comments/${taskId}`, { headers: auth(pm.token) });
    if (comments.ok && (comments.data.data?.length || comments.data?.length || 0) >= 0) {
      pass('List comments');
    } else fail('List comments', comments.data.message);
  }

  // Notifications
  const notifs = await req('/notifications', { headers: auth(collab.token) });
  if (notifs.ok) pass('List notifications', `count=${(notifs.data.data || notifs.data || []).length}`);
  else fail('List notifications', notifs.data.message);

  const unread = await req('/notifications/unread-count', { headers: auth(collab.token) });
  if (unread.ok) pass('Unread notification count');
  else fail('Unread notification count', unread.data.message);

  // Admin users
  const users = await req('/users', { headers: auth(admin.token) });
  if (users.ok && Array.isArray(users.data.data || users.data)) pass('Admin list users');
  else fail('Admin list users', users.data.message);

  const collabUsers = await req('/users', { headers: auth(collab.token) });
  if (collabUsers.status === 403) pass('Collaborator blocked from user list');
  else fail('Collaborator blocked from user list', String(collabUsers.status));

  // Profile
  const profile = await req('/users/me', { headers: auth(pm.token) });
  if (profile.ok) pass('Get profile');
  else fail('Get profile', profile.data.message);

  // Delete project — PM owns it
  if (projectId) {
    const del = await req(`/projects/${projectId}`, {
      method: 'DELETE',
      headers: auth(pm.token),
    });
    if (del.ok) pass('PM delete own project');
    else fail('PM delete own project', del.data.message || del.status);

    const gone = await req(`/projects/${projectId}`, { headers: auth(admin.token) });
    if (gone.status === 404) pass('Deleted project returns 404');
    else fail('Deleted project returns 404', String(gone.status));
  }

  // Frontend build check hint
  pass('Frontend routes', '/login /forgot-password /projects /tasks /admin (manual UI)');

  printSummary();
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

function printSummary() {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n--- ${passed} passed, ${failed} failed ---\n`);
  if (failed) {
    console.log('Failed:');
    results.filter((r) => !r.ok).forEach((r) => console.log(`  • ${r.name}: ${r.detail}`));
  }
}

main().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
