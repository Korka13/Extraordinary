var express     = require("express"),
    router      = express.Router(),
    Fact        = require("../models/fact"),
    middleware  = require("../middleware"),
    configs     = require("../configs"),
    upload      = configs.upload,
    cloudinary  = configs.cloudinary;


// facts index route
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

// new fact route

router.get("/new", middleware.isLoggedIn, function(req, res) {
    res.render("facts/new", {metaTitle: "Create New"});
});

// new fact post route

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

// FACTS SHOW ROUTE

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

// facts edit routes

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

// FACT DESTROY

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