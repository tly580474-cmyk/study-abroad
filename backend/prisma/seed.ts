import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      email: 'admin@example.com',
    },
  });
  console.log('创建管理员:', admin.username);

  const student = await prisma.user.upsert({
    where: { username: 'student1' },
    update: {},
    create: {
      username: 'student1',
      password: studentPassword,
      role: 'student',
      email: 'student1@example.com',
    },
  });
  console.log('创建学生:', student.username);

  const school1 = await prisma.school.create({
    data: {
      name: '麻省理工学院',
      country: '美国',
      city: '波士顿',
      description: '世界顶尖的私立研究型大学',
    },
  });
  console.log('创建学校:', school1.name, '- ID:', school1.id);

  const school2 = await prisma.school.create({
    data: {
      name: '斯坦福大学',
      country: '美国',
      city: '帕洛阿尔托',
      description: '硅谷的摇篮，创新精神的代表',
    },
  });
  console.log('创建学校:', school2.name, '- ID:', school2.id);

  const major1 = await prisma.major.create({
    data: {
      school_id: school1.id,
      name: '计算机科学',
      quota: 50,
      enrolled: 0,
      tuition: 55000,
      requirements: 'TOEFL 100+, GRE 320+',
    },
  });
  console.log('创建专业:', major1.name, '- ID:', major1.id);

  const major2 = await prisma.major.create({
    data: {
      school_id: school2.id,
      name: '计算机科学',
      quota: 30,
      enrolled: 0,
      tuition: 58000,
      requirements: 'TOEFL 100+, GRE 325+',
    },
  });
  console.log('创建专业:', major2.name, '- ID:', major2.id);

  const major3 = await prisma.major.create({
    data: {
      school_id: school2.id,
      name: '电子工程',
      quota: 25,
      enrolled: 0,
      tuition: 56000,
      requirements: 'TOEFL 100+, GRE 320+',
    },
  });
  console.log('创建专业:', major3.name, '- ID:', major3.id);

  console.log('\n数据初始化完成!');
  console.log('\n测试账号:');
  console.log('  管理员: admin / admin123');
  console.log('  学生: student1 / student123');
  console.log('\n专业ID (用于API测试):');
  console.log('  CS@MIT:', major1.id);
  console.log('  CS@Stanford:', major2.id);
  console.log('  EE@Stanford:', major3.id);
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
