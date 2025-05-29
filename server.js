// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// JWT中间件
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error();
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const photographer = await Photographer.findOne({ _id: decoded.id });
    if (!photographer) {
      throw new Error();
    }
    req.photographer = photographer;
    next();
  } catch (err) {
    res.status(401).json({ message: '请先登录' });
  }
};

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
  serviceInfo: [String], // 新增 服务信息
  highlights: [{
    title: String,
    desc: String
  }], // 新增 服务亮点
  createdAt: { type: Date, default: Date.now }
});

const Photographer = mongoose.model('snapmatephotographer', PhotographerSchema);

// 预约Schema
const BookingSchema = new mongoose.Schema({
  photographerId: { type: mongoose.Schema.Types.ObjectId, ref: 'snapmatephotographer', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', BookingSchema);

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

// Health check 路由
app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api', uploadRouter);

// 登录API
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 查找用户
    const photographer = await Photographer.findOne({ email });
    if (!photographer) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, photographer.password);
    if (!isMatch) {
      return res.status(401).json({ message: '邮箱或密码错误' });
    }

    // 生成JWT
    const token = jwt.sign({ id: photographer._id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({
      token,
      photographer: {
        id: photographer._id,
        username: photographer.username,
        email: photographer.email,
        avatar: photographer.avatar
      }
    });
  } catch (err) {
    console.error('登录失败:', err);
    res.status(500).json({ message: '登录失败' });
  }
});

// 获取当前用户信息
app.get('/api/me', auth, async (req, res) => {
  try {
    const photographer = await Photographer.findById(req.photographer._id)
      .select('-password');
    res.json(photographer);
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ message: '获取用户信息失败' });
  }
});

// 修改注册API，添加密码加密
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, location, bio, avatar, portfolio, devices, expertise, price } = req.body;
    
    // 校验必填项
    if (!username || !email || !password) {
      return res.status(400).json({ message: '用户名、邮箱和密码为必填项' });
    }

    // 检查邮箱唯一
    const exist = await Photographer.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: '该邮箱已被注册' });
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 存入数据库
    const newUser = new Photographer({
      username,
      email,
      password: hashedPassword,
      location,
      bio,
      avatar,
      portfolio,
      devices,
      expertise,
      price
    });
    await newUser.save();

    // 生成JWT
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      message: '注册成功',
      token,
      photographer: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar
      }
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.status(500).json({ message: '注册失败' });
  }
});

// 获取摄影师详情API
app.get('/api/photographers/:id', async (req, res) => {
  try {
    const photographer = await Photographer.findById(req.params.id)
      .select('-password'); // 不返回密码字段
    
    if (!photographer) {
      return res.status(404).json({ message: '摄影师不存在' });
    }

    // 获取摄影师的预约数量
    const completedSessions = await Booking.countDocuments({
      photographerId: req.params.id,
      status: 'accepted'
    });

    // 获取摄影师的评分（这里假设有评分系统，如果没有可以返回默认值）
    const rating = 4.98; // 这里可以从评分系统获取实际评分

    // 获取摄影师的评价
    const reviews = [
      {
        name: "Sarah",
        date: "March 2024",
        avatar: "https://i.postimg.cc/vZ5xmDzV/temp-Image9tf-RVx.avifg",
        content: "Sky not only took amazing photos but also showed me around the most beautiful spots in Seattle. Very professional and patient!"
      },
      {
        name: "Mike",
        date: "February 2024",
        avatar: "https://i.postimg.cc/RFLTJXLw/temp-Image3l3t4-I.avif",
        content: "Great experience! Sky knows how to guide poses and the photos turned out better than expected!"
      }
    ];

    res.status(200).json({
      ...photographer.toObject(),
      completedSessions,
      rating,
      reviews
    });
  } catch (err) {
    console.error('获取摄影师详情失败:', err);
    res.status(500).json({ message: '获取摄影师详情失败' });
  }
});

// 预约API
app.post('/api/bookings', async (req, res) => {
  try {
    const { photographerId, date, startTime, endTime, price } = req.body;

    // 验证必填字段
    if (!photographerId || !date || !startTime || !endTime || !price) {
      return res.status(400).json({ message: '缺少必要字段' });
    }

    // 验证摄影师是否存在
    const photographer = await Photographer.findById(photographerId);
    if (!photographer) {
      return res.status(404).json({ message: '摄影师不存在' });
    }

    // 检查时间冲突
    const existingBooking = await Booking.findOne({
      photographerId,
      date,
      status: 'accepted',
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    });

    if (existingBooking) {
      return res.status(400).json({ message: '该时间段已被预约' });
    }

    // 创建预约
    const newBooking = new Booking({
      photographerId,
      date,
      startTime,
      endTime,
      price
    });

    await newBooking.save();

    // 发送邮件通知摄影师（可选）
    /*
    await transporter.sendMail({
      from: `"SnapMate" <${process.env.EMAIL_USER}>`,
      to: photographer.email,
      subject: '新的预约请求 📸',
      html: `
        <h2>Hi ${photographer.username},</h2>
        <p>你收到了一个新的预约请求：</p>
        <p>日期：${date}</p>
        <p>时间：${startTime} - ${endTime}</p>
        <p>价格：$${price}</p>
        <br>
        <p>请尽快处理这个请求。</p>
      `,
    });
    */

    res.status(200).json({ message: '预约请求已发送' });
  } catch (err) {
    console.error('预约失败:', err);
    res.status(500).json({ message: '预约失败' });
  }
});

// 获取摄影师的预约列表
app.get('/api/bookings/:photographerId', async (req, res) => {
  try {
    const { photographerId } = req.params;
    const bookings = await Booking.find({ photographerId })
      .sort({ date: 1, startTime: 1 });
    res.status(200).json(bookings);
  } catch (err) {
    console.error('获取预约列表失败:', err);
    res.status(500).json({ message: '获取预约列表失败' });
  }
});

// 更新预约状态
app.put('/api/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '无效的状态' });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ message: '预约不存在' });
    }

    res.status(200).json(booking);
  } catch (err) {
    console.error('更新预约状态失败:', err);
    res.status(500).json({ message: '更新预约状态失败' });
  }
});

// 更新摄影师信息API
app.put('/api/photographers/:id', async (req, res) => {
  try {
    const updateFields = req.body;
    const photographer = await Photographer.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );
    if (!photographer) {
      return res.status(404).json({ message: '摄影师不存在' });
    }
    res.status(200).json(photographer);
  } catch (err) {
    res.status(500).json({ message: '更新失败' });
  }
});

// 让 /photographer 映射到 photographer.html
app.get('/photographer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'photographer.html'));
});

// 让 /login 映射到 login.html
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});