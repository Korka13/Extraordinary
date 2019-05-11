var express = require("express");
var router  = express.Router();
var Fact = require("../models/fact");
var middleware = require("../middleware");
var multer = require("multer");
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

var upload = multer({ storage: storage, fileFilter: imageFilter});

var cloudinary = require("cloudinary");
cloudinary.config({ 
  cloud_name: "korka", 
  api_key: process.env.CLOUDINARYAPIKEY, 
  api_secret: process.env.CLOUDINARYAPISECRET
});

// works index route
router.get("/", function(req, res){
    Fact.find({}, function(err, facts){
       if(err){
           console.log(err);
           res.redirect("back");
       } else {
           res.render("facts/index", {facts: facts});
       }
    });
});

// new work route

router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("facts/new", {metaTitle: "Create New"});
});

// new work post route

router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    if(req.fileValidationError){
        req.flash("error", req.fileValidationError);
        return res.redirect("back");
    }
    cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
        if(err){
            console.log(err);
            req.flash("error", err.message);
            return res.redirect("back");
        }
        // add cloudinary url for the image to the fact object under image property
        req.body.fact.image = result.secure_url;
        //add image id
        req.body.fact.imageId = result.public_id;
        // add author to fact
        req.body.fact.author = {
        id: req.user._id,
        username: req.user.username
        };
      Fact.create(req.body.fact, function(err, newFact) {
        if (err) {
            req.flash("error", "Something went wrong");
            console.log(err);
            res.redirect("back");
        } else {
            req.flash("success", "Extraordinary fact created");
            res.redirect("/facts/" + newFact.id);
        }
      });
    });
});

// WORKS SHOW ROUTE

router.get("/:id", function(req, res) {
    Fact.findById(req.params.id).populate("comments").exec(function(err, foundFact){
        if(err || !foundFact){
            req.flash("error", "Fact not found");
            console.log(err);
            res.redirect("/facts");
        } else {
            res.render("facts/show", {fact: foundFact, metaTitle: foundFact.title});
        }
    });
});

// Works edit routes

router.get("/:id/edit", middleware.checkFactOwnership, function(req, res){
        Fact.findById(req.params.id, function(err, foundFact){
            if(err || !foundFact) {
                console.log(err);
                req.flash("error", "Fact not found");
                res.redirect("/facts");
            } else{
                res.render("facts/edit", {fact: foundFact, metaTitle: "Edit " + foundFact.title});
            }
    });
});

router.put("/:id", middleware.checkFactOwnership, upload.single("image"), function(req, res){
    if(req.fileValidationError){
            req.flash("error", req.fileValidationError);
            return res.redirect("back");
        }
    Fact.findById(req.params.id, async function(err, foundFact){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.file) {
              try {
                  await cloudinary.v2.uploader.destroy(foundFact.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  foundFact.imageId = result.public_id;
                  foundFact.image = result.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            foundFact.title = req.body.title;
            foundFact.category = req.body.category;
            foundFact.description = req.body.description;
            foundFact.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/facts/" + foundFact._id);
        }
    });
});

// WORK DESTROY

router.delete("/:id", middleware.checkFactOwnership, function(req, res){
    Fact.findById(req.params.id, async function(err, foundFact){
        if(err){
            req.flash("error", err.message);
            console.log(err);
            res.redirect("/facts/" + req.params.id);
        } try {
            await cloudinary.v2.uploader.destroy(foundFact.imageId);
            foundFact.remove();
            req.flash("success", "The fact has been deleted");
            res.redirect("/facts");
        } catch(err){
              req.flash("error", err.message);
              return res.redirect("back");
        }
    });
});

module.exports = router;