var multer = require("multer");
var configs = {};

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});

var imageFilter = function (req, file, cb) {
    // accept image files only
    var type = file.mimetype;
    var typeArray = type.split("/");
    if (typeArray[0] !== "image") {
        req.fileValidationError = "The uploaded file is not an image";
        return cb(null, false, req.fileValidationError);
    }
    cb(null, true);
};

configs.upload = multer({ storage: storage, fileFilter: imageFilter});

configs.cloudinary = require("cloudinary");
configs.cloudinary.config({ 
  cloud_name: "korka", 
  api_key: process.env.CLOUDINARYAPIKEY,
  api_secret: process.env.CLOUDINARYAPISECRET
});

module.exports = configs;