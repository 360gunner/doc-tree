const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

// File type validation (extended)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/x-msvideo', 'video/quicktime', 'video/mpeg'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1024 * 1024 * 100 } // 100MB limit
});

// File upload route supporting multiple files
router.post('/', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const filePaths = req.files.map(file => 
      `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
    );

    res.json({ filePaths: filePaths.join(',') });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
