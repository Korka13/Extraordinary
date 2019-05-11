var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");
var Fact = require("../models/fact");
var middleware = require("../middleware");
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
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

// Landing route
router.get("/", function(req, res) {
    res.render("landing");
});

// AUTH ROUTES

// show register form
router.get("/register", function(req, res) {
    res.render("register", {metaTitle: "Register"});
});

// sign up logic
router.post("/register", upload.single('avatar'), async function(req, res){
  if(req.fileValidationError){
        req.flash("error", req.fileValidationError);
        return res.redirect("back");
    }
  if(req.file){
    try {
      var result = await cloudinary.v2.uploader.upload(req.file.path);
      req.body.avatar = result.secure_url;
      req.body.avatarId = result.public_id;
    } catch(err) {
          req.flash("error", err.message);
          return res.redirect("back");
    }
  }
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar || undefined,
        avatarId: req.body.avatarId,
        about: req.body.about
    });
    User.register(newUser, req.body.password, function(err, user){
        if(err){
          if(err.code === 11000){
            err.message = "email alrady registered";
          }
            req.flash("error", err.message);
            console.log(err);
            return res.render("register", {error: err.message});
        } else {
            passport.authenticate("local")(req, res, function(){
                req.flash("success", "Thanks for joining " + user.username + "!");
                res.redirect("/facts");
            });
        }
    });
});

// show login form
router.get("/login", function(req, res){
    // console.log(req.header("Refer"));
    // req.session.returnTo = req.header("Refer");
    res.render("login", {metaTitle: "Login"});
});

//login logic

router.post("/login", function(req,res,next){
    passport.authenticate("local" ,
    {
        successReturnToOrRedirect:"/facts",
        failureRedirect:"/login",
        failureFlash: true,
        successFlash:"Welcome back "+req.body.username+"!"
    })(req,res,next);});

// router.post("/login", passport.authenticate("local", 
//     {
//         successReturnToOrRedirect: "/works",
//         failureRedirect: "/login",
//         failureFlash: true
//     }), function(req, res){
// });

// logout route
router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "Logged you out!");
    res.redirect("back");
});

// password reset
router.get("/forgot", function(req, res) {
    res.render("forgot", {metaTitle: "Forgot password"});
});

router.post("/forgot", function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString("hex");
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (err || !user) {
          req.flash("error", "No account with that email address exists.");
          return res.redirect("/forgot");
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: "Gmail", 
        auth: {
          user: "korka1313@gmail.com",
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: "korka1313@gmail.com",
        subject: "Extraordinary.gq Password Reset",
        text: "You are receiving this because you (or someone else) have requested the reset of the password for the account associated to this email.\n\n" +
          "If you just forgot your username to login, please use: " + user.username + "\n\n" +
          "Please click on the following link, or paste this into your browser to reset your password:\n\n" +
          "http://" + req.headers.host + "/reset/" + token + "\n\n" +
          "If you did not request this, please ignore this email and your password will remain unchanged.\n"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log("mail sent");
        req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions.");
        done(err, "done");
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect("/forgot");
  });
});

router.get("/reset/:token", function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (err || !user) {
      req.flash("error", "Password reset token is invalid or has expired.");
      return res.redirect("/forgot");
    }
    res.render("reset", {token: req.params.token, metaTitle: "Reset Password"});
  });
});

router.post("/reset/:token", function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (err || !user) {
          req.flash("error", "Password reset token is invalid or has expired.");
          return res.redirect("back");
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
              if(err){
                  console.log(err);
                  req.flash("error", err.message);
                  res.redirect("back");
              }
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            user.save(function(err) {
                if(err){
                    console.log(err);
                    req.flash("error", err.message);
                    res.redirect("back");
                }
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          });
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect("back");
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: "Gmail", 
        auth: {
          user: "korka1313@gmail.com",
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: "korka1313@mail.com",
        subject: "Your password has been changed",
        text: "Hello,\n\n" +
          "This is a confirmation that the password for your account " + user.email + " has just been changed.\n"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash("success", "Success! Your password has been changed.");
        done(err);
      });
    }
  ], function(err) {
      if(err){
        console.log(err);
        req.flash("error", err.message);
        res.redirect("back");
      }
    res.redirect("/facts");
  });
});


//user profile

router.get("/users/:id", function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if(err || !foundUser){
            console.log(err); // this is not getting the error, if the user does not exists it logs null
            req.flash("error", "User not found");
            res.redirect("back");
        } else {
            Fact.find({"author.id": req.params.id}, function(err, foundFacts){
                if(err){
                    console.log(err);
                } else{
                    res.render("users/show", {user: foundUser, facts: foundFacts, metaTitle: foundUser.username + "'s profile"});
                }
            });
        }
    });
});

router.get("/users/:id/edit", middleware.checkUser, function(req, res) {
    User.findById(req.params.id, function(err, foundUser){
        if(err){
            console.log(err);
            req.flash("error", "User not found");
            res.redirect("back");
        } else {
            res.render("users/edit", {user: foundUser, metaTitle: "Edit your profile"});
        }
    });
});

router.put("/users/:id", middleware.checkUser, upload.single("avatar"), function(req, res){
  if(req.fileValidationError){
        req.flash("error", req.fileValidationError);
        return res.redirect("back");
    }
    User.findById(req.params.id, async function(err, foundUser){
        if(err){
            console.log(err);
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if(req.file){
              try {
                if(foundUser.avatarId){
                  await cloudinary.v2.uploader.destroy(foundUser.avatarId);
                }
                  var result = await cloudinary.v2.uploader.upload(req.file.path);
                  foundUser.avatarId = result.public_id;
                  foundUser.avatar = result.secure_url;
              } catch(err){
                req.flash("error", err.message);
                res.redirect("back");
              }
            }
            foundUser.firstName = req.body.firstName;
            foundUser.lastName = req.body.lastName;
            foundUser.email = req.body.email;
            foundUser.about = req.body.about;
            foundUser.save();
            req.flash("success", "Changes saved!");
            res.redirect("/users/" + req.params.id);
        }
    });
});

router.delete("/users/:id",middleware.checkUser, function(req, res){
    User.findById(req.params.id, async function(err, foundUser){
        if(err){
            req.flash("error", err.message);
            console.log(err);
            res.redirect("/users/" + req.params.id);
        } try {
          if(foundUser.avatarId){
            await cloudinary.v2.uploader.destroy(foundUser.avatarId);
          }
            foundUser.remove();
            req.flash("success", "We are sorry to see you going away " + foundUser.username + "! You'll be always welcome back!");
            res.redirect("/facts");
        } catch(err){
              req.flash("error", err.message);
              return res.redirect("back");
        }
    });
});

module.exports = router;