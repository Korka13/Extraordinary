var express             = require("express"),
    app                 = express(),
    bodyParser          = require("body-parser"),
    mongoose            = require("mongoose"),
    flash               = require("connect-flash"),
    passport            = require("passport"),
    LocalStrategy       = require("passport-local"),
    methodOverride      = require("method-override"),
    User                = require("./models/user");
    
require('dotenv').config();

var indexRoutes   = require("./routes/index"),
    factRoutes    = require("./routes/facts"),
    commentRoutes = require("./routes/comments"),
    profileRoutes = require("./routes/profile");

const databaseUri = process.env.DATABASE;

mongoose.connect(databaseUri, { useNewUrlParser: true });
mongoose.set("useFindAndModify", false);
mongoose.set('useCreateIndex', true);
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: process.env.SECRETPHRASE,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.metaTitle = "Extraodinary Facts";
    next();
});

app.use("/", indexRoutes);
app.use("/facts", factRoutes);
app.use("/facts/:id/comments/", commentRoutes);
app.use("/users", profileRoutes);

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server started...");
});