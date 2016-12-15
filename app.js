var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var routes = require('./routes/index');
var auth = require('./routes/auth');

var models = require('./models/models')
var User = models.User;

var FacebookStrategy = require('passport-facebook').Strategy;

var app = express();

// Make sure we have all required env vars. If these are missing it can lead
// to confusing, unpredictable errors later.
var REQUIRED_ENV = "FROM_PHONE TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN SECRET".split(" ");
REQUIRED_ENV.forEach(function(el) {
  if (!process.env[el])
    throw new Error("Missing required env var " + el);
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Passport stuff here
// express-session: sets req.cookies on all requests sent to your website
var session = require('express-session');
app.use(session({ secret: 'keyboard cat' }));

// Tell Passport how to set req.user
// how express attaches req.user (to current user)
passport.serializeUser(function(user, done) {
  done(null, user._id);
});

// how express sets req.user = undefined for logout
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Tell passport how to read our user models
// LocalStrategy defines strategy for which we log ppl in
passport.use(new LocalStrategy(function(username, password, done) {
  // Find the user with the given username
    User.findOne({ username: username }, function (err, user) {
      // if there's an error, finish trying to authenticate (auth failed)
      if (err) {
        console.log(err);
        return done(err);
      }
      // if no user present, auth failed
      if (!user) {
        console.log(user);
        return done(null, false,{ message: 'Incorrect username.' });
      }
      // if passwords do not match, auth failed
      if (user.password !== password) {
        return done(null, false,{ message: 'Incorrect password.' });
      }
      // auth has succeeded
      return done(null, user);
    });
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: process.env.FB_CALLBACK_URL
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, {
      username: " ",
      password: " ",
      facebookId: profile.id
    }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', auth(passport));
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
