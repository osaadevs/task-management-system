-- ============================================================
-- TASK MANAGEMENT SYSTEM (TMS) — SEED DATA
-- MySQL 8.0
-- ============================================================
-- Run this AFTER schema.sql to populate lookup tables and
-- insert realistic sample data for development and testing.
-- ============================================================

USE tms_db;

-- ------------------------------------------------------------
-- 1. ROLES (Lookup Data)
-- ------------------------------------------------------------
INSERT INTO roles (id, role_name) VALUES
    (1, 'Admin'),
    (2, 'Project Manager'),
    (3, 'Collaborator');

-- ------------------------------------------------------------
-- 2. USERS
-- ------------------------------------------------------------
-- Passwords are bcrypt hashes of the placeholder 'Password@123'
-- In production, NEVER store plaintext passwords.
-- bcrypt hash for Password@123 (cost factor 12)
-- ------------------------------------------------------------
INSERT INTO users (id, role_id, full_name, email, password_hash, is_first_login, is_active, profile_image) VALUES
    (1, 1, 'Yasith Mavinda',       'yasith@tms.com',       '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS', FALSE, TRUE, NULL),
    (2, 2, 'Sarah Johnson',        'sarah.j@tms.com',      '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS', FALSE, TRUE, NULL),
    (3, 2, 'Michael Chen',         'michael.c@tms.com',    '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS', FALSE, TRUE, NULL),
    (4, 3, 'Emily Rodriguez',      'emily.r@tms.com',      '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS', TRUE,  TRUE, NULL),
    (5, 3, 'David Kim',            'david.k@tms.com',      '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS', TRUE,  TRUE, NULL),
    (6, 3, 'Aisha Patel',          'aisha.p@tms.com',      '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS', FALSE, TRUE, NULL),
    (7, 3, 'James O''Brien',       'james.o@tms.com',      '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS', FALSE, FALSE, NULL);

-- ------------------------------------------------------------
-- 3. PROJECTS
-- ------------------------------------------------------------
INSERT INTO projects (id, project_name, description, created_by, start_date, end_date, status) VALUES
    (1, 'E-Commerce Platform',  'Full-stack e-commerce application with payment integration and inventory management.',           2, '2026-06-01', '2026-09-30', 'Active'),
    (2, 'Mobile Banking App',   'Cross-platform mobile banking solution with biometric authentication.',                           3, '2026-07-01', '2026-12-31', 'Active'),
    (3, 'HR Management System', 'Internal HR system for employee onboarding, leave management, and payroll.',                      2, '2026-05-15', '2026-08-15', 'On Hold'),
    (4, 'Data Analytics Portal','Real-time analytics dashboard for business intelligence and KPI tracking.',                       1, '2026-03-01', '2026-06-30', 'Completed');

-- ------------------------------------------------------------
-- 4. PROJECT MEMBERS
-- ------------------------------------------------------------
INSERT INTO project_members (project_id, user_id) VALUES
    -- E-Commerce Platform: PM Sarah + 3 collaborators
    (1, 2),
    (1, 4),
    (1, 5),
    (1, 6),
    -- Mobile Banking App: PM Michael + 2 collaborators
    (2, 3),
    (2, 5),
    (2, 6),
    -- HR Management System: PM Sarah + 1 collaborator
    (3, 2),
    (3, 4),
    -- Data Analytics Portal: Admin Yasith + PM Michael
    (4, 1),
    (4, 3);

-- ------------------------------------------------------------
-- 5. TASKS
-- ------------------------------------------------------------
INSERT INTO tasks (id, project_id, title, description, priority, status, due_date, created_by) VALUES
    -- E-Commerce Platform tasks
    (1,  1, 'Design database schema',          'Create ER diagrams and write DDL scripts for the product catalog, orders, and user tables.',   'High',   'Completed',    '2026-06-15', 2),
    (2,  1, 'Implement user authentication',   'Build JWT-based auth with login, register, and password reset flows.',                          'High',   'In Progress',  '2026-06-20', 2),
    (3,  1, 'Build product listing page',      'Responsive grid layout with filtering, sorting, and pagination.',                               'Medium', 'To Do',        '2026-07-01', 2),
    (4,  1, 'Integrate Stripe payments',       'Set up Stripe SDK, create checkout flow, handle webhooks for payment confirmation.',             'High',   'To Do',        '2026-07-15', 2),
    (5,  1, 'Write unit tests for cart module', 'Achieve ≥ 80% code coverage on the shopping cart service layer.',                               'Low',    'To Do',        '2026-07-20', 2),

    -- Mobile Banking App tasks
    (6,  2, 'Design UI wireframes',            'Create Figma wireframes for all core screens (dashboard, transfer, history).',                  'High',   'In Progress',  '2026-07-10', 3),
    (7,  2, 'Set up CI/CD pipeline',           'Configure GitHub Actions for automated testing and deployment to staging.',                     'Medium', 'To Do',        '2026-07-20', 3),
    (8,  2, 'Implement biometric login',       'Integrate fingerprint and Face ID authentication for iOS and Android.',                         'High',   'To Do',        '2026-08-01', 3),

    -- HR Management System tasks
    (9,  3, 'Create employee onboarding form', 'Multi-step form with document upload and manager approval workflow.',                           'Medium', 'In Progress',  '2026-06-30', 2),
    (10, 3, 'Build leave management module',   'Calendar-based leave requests with approval chain and balance tracking.',                       'High',   'To Do',        '2026-07-15', 2),

    -- Data Analytics Portal tasks
    (11, 4, 'Build KPI dashboard',             'Interactive dashboard with Chart.js showing revenue, users, and conversion metrics.',           'High',   'Completed',    '2026-05-30', 1),
    (12, 4, 'Export reports to PDF',            'Server-side PDF generation for monthly analytics reports.',                                     'Medium', 'Completed',    '2026-06-15', 3);

-- ------------------------------------------------------------
-- 6. TASK ASSIGNMENTS
-- ------------------------------------------------------------
INSERT INTO task_assignments (task_id, user_id) VALUES
    (1,  4),    -- Emily → Design database schema
    (1,  5),    -- David  → Design database schema
    (2,  5),    -- David  → Implement user authentication
    (3,  6),    -- Aisha  → Build product listing page
    (4,  4),    -- Emily  → Integrate Stripe payments
    (4,  5),    -- David  → Integrate Stripe payments
    (5,  6),    -- Aisha  → Write unit tests
    (6,  5),    -- David  → Design UI wireframes
    (6,  6),    -- Aisha  → Design UI wireframes
    (7,  5),    -- David  → Set up CI/CD pipeline
    (8,  6),    -- Aisha  → Implement biometric login
    (9,  4),    -- Emily  → Create employee onboarding form
    (10, 4),    -- Emily  → Build leave management module
    (11, 3),    -- Michael → Build KPI dashboard
    (12, 3);    -- Michael → Export reports to PDF

-- ------------------------------------------------------------
-- 7. COMMENTS
-- ------------------------------------------------------------
INSERT INTO comments (task_id, user_id, comment_text, created_at) VALUES
    (1, 4, 'I have completed the ER diagram. Please review the normalization approach.',           '2026-06-10 09:30:00'),
    (1, 2, 'Looks great! Make sure to add composite indexes for the search queries.',              '2026-06-10 10:15:00'),
    (1, 5, 'Added the DDL scripts. All foreign keys and constraints are in place.',                '2026-06-12 14:00:00'),
    (2, 5, 'JWT implementation is ready. Working on the refresh token rotation now.',               '2026-06-15 11:00:00'),
    (2, 2, 'Remember to add rate limiting on the login endpoint to prevent brute-force attacks.',   '2026-06-15 11:30:00'),
    (6, 5, 'First draft of the wireframes is ready in Figma. Sharing the link now.',               '2026-07-05 16:00:00'),
    (6, 3, 'The transfer screen needs a confirmation step before submitting. Please add that.',    '2026-07-06 09:00:00'),
    (9, 4, 'The multi-step form is functional. Need feedback on the document upload UX.',          '2026-06-25 13:45:00'),
    (11, 3, 'Dashboard is live on staging. All charts render correctly with real-time data.',      '2026-05-28 17:00:00'),
    (11, 1, 'Excellent work! Approved for production deployment.',                                 '2026-05-29 10:00:00');

-- ------------------------------------------------------------
-- 8. ATTACHMENTS
-- ------------------------------------------------------------
INSERT INTO attachments (task_id, uploaded_by, file_name, file_url) VALUES
    (1,  4, 'er_diagram_v2.png',            'https://storage.tms.com/attachments/1/er_diagram_v2.png'),
    (1,  5, 'schema_ddl_scripts.sql',       'https://storage.tms.com/attachments/1/schema_ddl_scripts.sql'),
    (6,  5, 'wireframes_v1.pdf',            'https://storage.tms.com/attachments/6/wireframes_v1.pdf'),
    (6,  5, 'mobile_mockup_dashboard.png',  'https://storage.tms.com/attachments/6/mobile_mockup_dashboard.png'),
    (9,  4, 'onboarding_form_spec.docx',    'https://storage.tms.com/attachments/9/onboarding_form_spec.docx'),
    (11, 3, 'kpi_dashboard_screenshot.png', 'https://storage.tms.com/attachments/11/kpi_dashboard_screenshot.png'),
    (12, 3, 'sample_monthly_report.pdf',    'https://storage.tms.com/attachments/12/sample_monthly_report.pdf');

-- ------------------------------------------------------------
-- 9. NOTIFICATIONS
-- ------------------------------------------------------------
INSERT INTO notifications (user_id, title, message, type, is_read, created_at) VALUES
    (4, 'New Task Assigned',        'You have been assigned to "Design database schema" in E-Commerce Platform.',             'Assignment',       TRUE,   '2026-06-05 09:00:00'),
    (5, 'New Task Assigned',        'You have been assigned to "Design database schema" in E-Commerce Platform.',             'Assignment',       TRUE,   '2026-06-05 09:00:00'),
    (5, 'New Task Assigned',        'You have been assigned to "Implement user authentication" in E-Commerce Platform.',      'Assignment',       TRUE,   '2026-06-10 10:00:00'),
    (2, 'Task Status Changed',      '"Design database schema" has been marked as Completed.',                                 'Status Change',    TRUE,   '2026-06-12 15:00:00'),
    (5, 'New Comment',              'Sarah Johnson commented on "Implement user authentication".',                             'Comment',          FALSE,  '2026-06-15 11:30:00'),
    (4, 'Deadline Approaching',     'Task "Integrate Stripe payments" is due in 3 days.',                                     'Deadline',         FALSE,  '2026-07-12 08:00:00'),
    (6, 'New Task Assigned',        'You have been assigned to "Build product listing page" in E-Commerce Platform.',         'Assignment',       FALSE,  '2026-06-18 09:00:00'),
    (1, 'System Maintenance',       'Scheduled database maintenance on Sunday 2026-06-28 from 02:00–04:00 UTC.',              'System',           FALSE,  '2026-06-25 12:00:00'),
    (5, 'Deadline Approaching',     'Task "Set up CI/CD pipeline" is due in 5 days.',                                         'Deadline',         FALSE,  '2026-07-15 08:00:00'),
    (3, 'Task Status Changed',      '"Export reports to PDF" has been marked as Completed.',                                   'Status Change',    TRUE,   '2026-06-15 16:00:00');

-- ------------------------------------------------------------
-- 10. PASSWORD RESETS (Example — tokens are hashed)
-- ------------------------------------------------------------
INSERT INTO password_resets (user_id, reset_token, expires_at, used) VALUES
    (4, SHA2('sample-reset-token-emily-2026', 256),  '2026-06-12 10:00:00', TRUE),
    (7, SHA2('sample-reset-token-james-2026', 256),  '2026-06-13 23:59:59', FALSE);
