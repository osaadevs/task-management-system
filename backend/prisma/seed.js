const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PASSWORD_HASH = '$2b$12$6fmOrWqxP1rwW1Gv0D1t3ONwEcIQaBjf64.yyqtYsn8gkL2NhHViS';

async function main() {
  await prisma.role.createMany({
    data: [
      { id: 1, roleName: 'Admin' },
      { id: 2, roleName: 'Project Manager' },
      { id: 3, roleName: 'Collaborator' },
    ],
    skipDuplicates: true,
  });

  await prisma.user.createMany({
    data: [
      { id: 1, roleId: 1, fullName: 'Yasith Mavinda', email: 'yasith@tms.com', passwordHash: PASSWORD_HASH, isFirstLogin: false },
      { id: 2, roleId: 2, fullName: 'Sarah Johnson', email: 'sarah.j@tms.com', passwordHash: PASSWORD_HASH, isFirstLogin: false },
      { id: 3, roleId: 2, fullName: 'Michael Chen', email: 'michael.c@tms.com', passwordHash: PASSWORD_HASH, isFirstLogin: false },
      { id: 4, roleId: 3, fullName: 'Emily Rodriguez', email: 'emily.r@tms.com', passwordHash: PASSWORD_HASH, isFirstLogin: true },
      { id: 5, roleId: 3, fullName: 'David Kim', email: 'david.k@tms.com', passwordHash: PASSWORD_HASH, isFirstLogin: true },
      { id: 6, roleId: 3, fullName: 'Aisha Patel', email: 'aisha.p@tms.com', passwordHash: PASSWORD_HASH, isFirstLogin: false },
    ],
    skipDuplicates: true,
  });

  await prisma.project.createMany({
    data: [
      { id: 1, projectName: 'E-Commerce Platform', description: 'Full-stack e-commerce application.', createdBy: 2, status: 'Active' },
      { id: 2, projectName: 'Mobile Banking App', description: 'Cross-platform mobile banking.', createdBy: 3, status: 'Active' },
    ],
    skipDuplicates: true,
  });

  await prisma.task.createMany({
    data: [
      { id: 1, projectId: 1, title: 'Design database schema', description: 'Create ER diagrams and DDL scripts.', priority: 'High', status: 'Completed', createdBy: 2 },
      { id: 2, projectId: 1, title: 'Implement user authentication', description: 'JWT-based auth flows.', priority: 'High', status: 'In Progress', createdBy: 2 },
      { id: 3, projectId: 1, title: 'Build product listing page', description: 'Responsive grid with filters.', priority: 'Medium', status: 'To Do', createdBy: 2 },
      { id: 4, projectId: 2, title: 'Design UI wireframes', description: 'Figma wireframes for core screens.', priority: 'High', status: 'In Progress', createdBy: 3 },
    ],
    skipDuplicates: true,
  });

  console.log('Seed complete. Login: sarah.j@tms.com / Password@123');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
