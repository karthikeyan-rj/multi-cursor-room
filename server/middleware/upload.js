const multer = require('multer');

const storage = multer.memoryStorage();

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'text/plain', 'text/markdown', 'text/csv',
  'application/json', 'application/pdf'
];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed. Supported: images (jpg/png/webp/gif), text (txt/md/json/csv), and PDF.'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload;
