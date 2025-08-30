// const multer = require("multer")
// const path = require ("path")

// const storage = multer.diskStorage({
//   destination : (req,file,cb) => {
//     cb(null, path.join(__dirname, "../public/uploads/re-image"))
//   },
//   filename : (req,file,cb) => {
//     cb (null, Date.now() + "-" + file.originalname)
//   }
// })

// const uploads = multer({
//   storage,
//   limits: {
//     fileSize: 5 * 1024 * 1024 // 5MB limit per image
//   },
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = /jpeg|jpg|png/;
//     const ext = path.extname(file.originalname).toLowerCase();
//     if (allowedTypes.test(ext)) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only JPEG, JPG, and PNG formats are allowed"));
//     }
//   }
// });

// module.exports = uploads;


const fs = require("fs");
const multer = require("multer");
const path = require("path");

const uploadDir = path.join(__dirname, "../public/uploads/re-image");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + "-" + file.originalname;
    console.log("Saving file:", filename);
    cb(null, filename);
  },
});

const uploads = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = /jpeg|jpg|png/;
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, JPG, and PNG formats are allowed"));
    }
  }
});

module.exports = uploads;
