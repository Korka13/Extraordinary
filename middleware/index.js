var Fact = require("../models/fact");
var Comment = require("../models/comment");
var User = require("../models/user");
var middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    } else{
        req.flash("error", "Please Login First");
        req.session.returnTo = req.originalUrl;
        res.redirect("/login");
    }
};

middlewareObj.checkFactOwnership = function(req, res, next) {
    //is the user loggedin?
    if(req.isAuthenticated()){
            Fact.findById(req.params.id, function(err, foundFact){
        if(err || !foundFact){
            req.flash("error", "Fact not found");
            console.log(err);
            res.redirect("/facts");
        } else {
            if(foundFact.author.id.equals(req.user._id)){
                next();
            } else {
                req.flash("error", "You do not have permission to do that");
                res.redirect("back");
            }
        }
    });
    }
    else {
        req.flash("error", "Please Login First")
        res.redirect("/login");
    }
};

middlewareObj.checkCommentOwnership = function(req, res, next) {
    //is the user loggedin?
    if(req.isAuthenticated()){
            Comment.findById(req.params.comment_id, function(err, foundComment){
        if(err || !foundComment){
            req.flash("error", "Comment not found");
            console.log(err);
            res.redirect("back");
        } else {
            if(foundComment.author.id.equals(req.user._id)){
                next();
            } else {
                req.flash("error", "You do not have permission to do that");
                res.redirect("back");
            }
        }
    });
    }
    else {
        req.flash("error", "Please Login First");
        res.redirect("/login");
    }
};

middlewareObj.checkUser = function(req, res, next) {
    //is the user loggedin?
    if(req.isAuthenticated()){
            User.findById(req.params.id, function(err, foundUser){
        if(err || !foundUser){
            req.flash("error", "User not found");
            console.log(err);
            res.redirect("back");
        } else {
            if(foundUser._id.equals(req.user._id)){
                next();
            } else {
                req.flash("error", "You can edit only your own profile");
                res.redirect("/users/" + req.params.id);
            }
        }
    });
    }
    else {
        req.flash("error", "Login to your account to edit it");
        res.redirect("/login");
    }
};

module.exports = middlewareObj;