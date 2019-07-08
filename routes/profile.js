var express = require("express"),
    router  = express.Router(),
    User = require("../models/user"),
    Fact = require("../models/fact"),
    middleware = require("../middleware"),
    configs = require("../configs"),
    upload = configs.upload,
    cloudinary = configs.cloudinary;

//user profile

router.get("/:id", function(req, res){
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

// Edit user

router.get("/:id/edit", middleware.checkUser, function(req, res) {
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

router.put("/:id", middleware.checkUser, upload.single("avatar"), function(req, res){
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

// Delete user

router.delete("/:id",middleware.checkUser, function(req, res){
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