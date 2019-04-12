var express = require("express");
var router  = express.Router({mergeParams: true});
var Fact = require("../models/fact");
var Comment = require("../models/comment");
var middleware = require("../middleware");

// NEW COMMENTS ROUTE
router.get("/new", middleware.isLoggedIn, function(req, res) {
    Fact.findById(req.params.id, function(err, foundFact){
        if(err || !foundFact){
            req.flash("error", "Fact not found");
            console.log(err);
            res.redirect("back");
        } else {
            res.render("comments/new", {fact: foundFact});
        }
    });
});

// CREATE COMMENT ROUTE
router.post("/", middleware.isLoggedIn, function(req, res){
    var newComment = req.body.comment;
    Fact.findById(req.params.id, function(err, foundFact){
        if(err || !foundFact){
            req.flash("error", "Fact not found");
            console.log(err);
            res.redirect("back");
        } else {
            Comment.create(newComment, function(err, comment){
                if(err){
                    req.flash("error", err.message);
                    console.log(err);
                    res.redirect("back");
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    foundFact.comments.push(comment);
                    foundFact.save();
                    req.flash("success", "Comment added successfully");
                    res.redirect("/facts/" + foundFact._id);
                }
            });
        }
    });
});

// edit comment routes

router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
    Fact.findById(req.params.id, function(err, foundFact){
        if(err || !foundFact){
            req.flash("error", "Fact not found");
            console.log(err);
            res.redirect("back");
        } else {
            Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundComment){
                req.flash("error", "Comment not found");
                console.log(err);
                res.redirect("back");
            } else {
                res.render("comments/edit", {fact: foundFact, comment: foundComment});
            }
        });
        }
    });
});

// update route

router.put("/:comment_id", middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if(err){
            req.flash("error", "An error occured");
            console.log(err);
            res.redirect("back");
        } else {
            req.flash("success", "Comment updated successfully");
            res.redirect("/facts/" + req.params.id);
        }
    });
});

// comment destroy route

router.delete("/:comment_id", middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err, removedComment){
        if(err){
            req.flash("err", "An error occured");
            console.log(err);
            res.redirect("back");
        } else {
            req.flash("success", "Comment deleted")
            res.redirect("/facts/" + req.params.id);
        }
    });
});

module.exports = router;