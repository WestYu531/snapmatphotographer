const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'snapmate', // 替换为你的cloud_name
  api_key: '451666656835754',      // 替换为你的api_key
  api_secret: 'oxBQjhqUC7qM7K6_kvCRPNr8p6U' // 替换为你的api_secret
});

module.exports = cloudinary; 