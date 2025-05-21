// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // 从 .env 文件读取环境变量

const path = require('path'); // ✅ 新增
const uploadRouter = require('./upload');

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

// 用户等待列表Schema
const UserWaitlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  ref: String,
  createdAt: { type: Date, default: Date.now }
});

const UserWaitlist = mongoose.model('UserWaitlist', UserWaitlistSchema);

// 摄影师注册Schema
const PhotographerSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  location: String,
  bio: String,
  avatar: String, // 头像url
  portfolio: [String], // 作品集url数组
  devices: [String],
  expertise: [String],
  price: Number,
  createdAt: { type: Date, default: Date.now }
});

const Photographer = mongoose.model('snapmatephotographer', PhotographerSchema);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
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
        <p>We'll notify you when registration officially opens.</p>
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

// 添加用户等待列表API
app.post('/api/user/join', async (req, res) => {
  try {
    const { name, email, phone, ref } = req.body;

    // 验证必填字段
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // 检查邮箱是否已存在
    const existingUser = await UserWaitlist.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // 存入数据库
    const newUser = new UserWaitlist({ name, email, phone, ref });
    await newUser.save();

    res.status(200).json({ message: 'Success' });
  } catch (err) {
    console.error('❌ Error during user registration:', err);
    res.status(500).json({ message: 'Failed to save' });
  }
});

// 获取用户等待列表API（可选，用于管理后台）
app.get('/api/user/waitlist', async (req, res) => {
  try {
    const users = await UserWaitlist.find({})
      .sort({ createdAt: -1 })
      .select('name email phone createdAt');
    
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ Error fetching waitlist:', err);
    res.status(500).json({ message: 'Failed to fetch waitlist' });
  }
});

// ✅ 新增 GET 路由
app.get('/joinnow', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'joinnow.html'));
});

// 添加根路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'new_index.html'));
});

app.use('/api', uploadRouter);

// 注册API
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, location, bio, avatar, portfolio, devices, expertise, price } = req.body;
    // 校验必填项
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'email or password is missing' });
    }
    // 检查邮箱唯一
    const exist = await Photographer.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: 'email already registered' });
    }
    // 密码加密（可选，建议用bcrypt）
    // const hash = await bcrypt.hash(password, 10);
    // 存入数据库
    const newUser = new Photographer({
      username,
      email,
      password, // 生产环境建议存hash
      location,
      bio,
      avatar,
      portfolio,
      devices,
      expertise,
      price
    });
    await newUser.save();
    res.status(200).json({ message: 'register success' });
  } catch (err) {
    console.error('register failed:', err);
    res.status(500).json({ message: 'register failed' });
  }
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});