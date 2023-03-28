require('dotenv').config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const bcrypt = require("bcrypt");
const saltRounds = 10;
// console.log(process.env)
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.set("view engine", "ejs");

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());


main().catch(err => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1/userDB", {useNewUrlParser: true});
}
const userSchema = new mongoose.Schema({  //New Schema
  username: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose); //

const User = new mongoose.model("User", userSchema); //New model User


//configure passport local strategy
passport.use(new LocalStrategy(
    function(username, password, done) {
      User.findOne({ username: username })
      .then((founduser)=>{
        if(!founduser){return done(null, false);}

        bcrypt.compare(password,founduser.password, (err, result) => {
            if (err){return done(err);}
            if (result) {return done(null,founduser);}
            return done (null,false);
        });
      })
      .catch((err)=>{
        return done(err);
      })
    }
));

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOne({ googleId: profile.id }).then((foundUser) => {
        if (foundUser) {
          console.log(profile);
          return foundUser;
        } else {
          const newUser = new User({
            googleId: profile.id
          });
          return newUser.save();
        }
      }).then((user) => {
        return cb(null, user);
      }).catch((err) => {
        return cb(err);
      });
  }
));

/ Routes---------------------------------------------------------------

//HOME
app.route('/')
    .get((req,res)=>{
        res.render('home')
    })

//auth
app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

//REGISTER
app.route('/register')
    .get((req,res)=>{
        res.render('register')
    })
    .post((req,res)=>{

        bcrypt.hash(req.body.password, saltRounds, (err,hash)=>{

            if(err){
                console.log(err)

            } else {
                const newUser = new User({
                    username: req.body.username,
                    password: hash
                })
                newUser.save()
                .then(()=>{
                    passport.authenticate('local', {
                        successRedirect: '/secrets',
                        failureRedirect: '/login'
                      })(req, res);
                })
            }
          })
    })

//LOGIN
app.route('/login')
    .get((req,res)=>{
        res.render('login')
    })
    .post((req,res)=>{
        const user = new User({
            username: req.body.useername,
            password: req.body.password
        })
      req.login(user, (err)=>{
        if(err){
            console.log(err)
        } else {
            passport.authenticate('local',{
                successRedirect: '/secrets'
              })(req, res);
        }
      })
    })

//SECRETS
app.get("/secrets",function(req,res){
  User.find({ secret: { $ne: null }})
  .then((foundUsers)=>{
    if (foundUsers) {
      res.render("secrets", { usersWithSecrets: foundUsers });
    }
  })
  .catch(err=>{
    res.send(err);
  })
});

//Submit
app.route("/submit")
  .get(function (req, res) {
    //route to submit new entries
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/");
    }
  })
  .post(function (req, res) {
    // console.log(req.user.id);
    User.findById(req.user.id)
    .then((foundUsers)=>{
      if (foundUser) {
        //if there is a user with provided Id
        foundUser.secret = req.body.secret;
        foundUser.save
          .then(success => {
                res.redirect("/secrets")
            }).catch(err => {
                console.log(err);
            })
      }
    })
    .catch(err=>{
      res.send(err);
    })
  });

//LOGOUT
app.route('/logout')
    .get((req,res)=>{
        req.logout((err)=>{
            if(err){
                console.log(err)
            } else {
                res.redirect('/')
            }
        });
    })


app.listen(3000, function() {
  console.log("Server is running on port 3000");
});
