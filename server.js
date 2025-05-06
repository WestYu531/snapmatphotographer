// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // 从 .env 文件读取环境变量

const app = express();
const PORT = process.env.PORT || 3000;

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
  createdAt: { type: Date, default: Date.now }
});

const Waitlist = mongoose.model('Waitlist', WaitlistSchema);

// POST 路由
app.post('/api/join', async (req, res) => {
  try {
    const newUser = new Waitlist(req.body);
    await newUser.save();
    res.status(200).json({ message: 'Success' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});