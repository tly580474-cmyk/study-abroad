import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function testEmail() {
  console.log('SMTP 配置:');
  console.log('  Host:', process.env.SMTP_HOST || 'smtp.163.com');
  console.log('  Port:', process.env.SMTP_PORT || '465');
  console.log('  Secure:', process.env.SMTP_SECURE === 'true');
  console.log('  User:', process.env.SMTP_USER);
  console.log('  Pass:', process.env.SMTP_PASS ? '***' : 'undefined');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.163.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  try {
    console.log('\n正在验证 SMTP 连接...');
    await transporter.verify();
    console.log('SMTP 连接验证成功');

    console.log('\n正在发送测试邮件...');
    await transporter.sendMail({
      from: `"留学管理系统" <${process.env.SMTP_USER}>`,
      to: 'mihil38068@mypethealh.com',
      subject: '【留学管理系统】邮箱配置测试',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">邮箱配置测试</h2>
          <p style="color: #555; font-size: 16px;">您好，</p>
          <p style="color: #555; font-size: 16px;">
            这是一封来自留学管理系统的测试邮件。
          </p>
          <p style="color: #555; font-size: 16px;">
            如果您收到此邮件，说明邮箱配置工作正常。
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          </p>
        </div>
      `,
    });

    console.log('测试邮件已成功发送到: mihil38068@mypethealh.com');
  } catch (error) {
    console.error('\n邮件发送失败:', error);
    process.exit(1);
  }
}

testEmail();
