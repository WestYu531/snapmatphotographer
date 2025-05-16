// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // 从 .env 文件读取环境变量

const path = require('path'); // ✅ 新增

const app = express();
const PORT = process.env.PORT || 3000;

const nodemailer = require('nodemailer');
require('dotenv').config();

// 邮件传输器配置
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // 提供前端页面

// MongoDB 连接
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Schema
const WaitlistSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  ref: String,
  createdAt: { type: Date, default: Date.now }
});

const Waitlist = mongoose.model('Waitlist', WaitlistSchema);


// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

app.post('/api/join', async (req, res) => {
  try {
    const { name, email, phone, ref } = req.body;

    // 存入数据库
    const newUser = new Waitlist({ name, email, phone, ref });
    await newUser.save();

    // 发送邮件
    /*
    await transporter.sendMail({
      from: `"SnapMate Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to SnapMate 📸',
      html: `
        <h2>Hi ${name},</h2>
        <p>Thank you for joining SnapMate! We're excited to have you on board.</p>
        <p>We’ll notify you when registration officially opens.</p>
        <br>
        <p>— The SnapMate Team</p>
      `,
    });
    */

    res.status(200).json({ message: 'Success' });
  } catch (err) {
    console.error('❌ Error during registration or email:', err);
    res.status(500).json({ message: 'Failed to save or send email' });
  }
});

// ✅ 新增 GET 路由
app.get('/joinnow', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'joinnow.html'));
});