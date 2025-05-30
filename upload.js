const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'snapmate', // 你可以自定义文件夹名
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
  }
});

const upload = multer({ storage: storage });

const router = express.Router();

// 单图上传（头像）
router.post('/upload/avatar', upload.single('avatar'), (req, res) => {
  res.json({ url: req.file.path });
});

// 多图上传（作品集）
router.post('/upload/portfolio', upload.array('photos', 20), (req, res) => {
  const urls = req.files.map(file => file.path);
  res.json({ urls });
});

module.exports = router; 