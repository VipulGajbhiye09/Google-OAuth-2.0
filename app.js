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
