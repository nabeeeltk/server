const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const getStorage = (subDir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', subDir);
    createUploadDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const memberPhotoFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
    cb(null, true);
  } else {
    cb(new Error('Only jpg/png/webp images are allowed for member photos'), false);
  }
};

const unitUploadsFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images, PDFs, and documents are allowed for unit uploads'), false);
  }
};

const galleryFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
    cb(null, true);
  } else {
    cb(new Error('Only jpg/png/webp images are allowed for gallery/programme photos'), false);
  }
};

const uploadMemberPhoto = multer({ 
  storage: getStorage('members'), 
  fileFilter: memberPhotoFilter,
  limits: { fileSize: parseInt(process.env.MEMBER_PHOTO_MAX_SIZE || 2097152) }
});

const uploadUnitFile = multer({ 
  storage: getStorage('unit-uploads'), 
  fileFilter: unitUploadsFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || 5242880) }
});

const uploadGalleryPhoto = multer({ 
  storage: getStorage('gallery'), 
  fileFilter: galleryFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || 5242880) }
});

const uploadProgrammePhoto = multer({ 
  storage: getStorage('programmes'), 
  fileFilter: galleryFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || 5242880) }
});

module.exports = {
  uploadMemberPhoto,
  uploadUnitFile,
  uploadGalleryPhoto,
  uploadProgrammePhoto
};
