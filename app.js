// app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const mongoose = require('mongoose');
const passport = require('passport');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const passkeyRoutes = require('./routes/passkey');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const router = require('./routes/auth');

dotenv.config();
require('./config/passport');
const app = express();

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// EJS
app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static(__dirname + "public"));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

//app.use(csrf());
app.use(passport.authenticate('session'));
app.use(function(req, res, next) {
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !! msgs.length;
  req.session.messages = [];
  next();
});
app.use(function(req, res, next) {
  //res.locals.csrfToken = req.csrfToken();
  res.locals.csrfToken = 'TODO';
  next();
});


// Routes
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/items', require('./routes/item'));
app.use('/', passkeyRoutes);
app.use('/', router);
app.use('/signup', router);
// app.use('/signup/public-key/challenge', router);
app.use('/login', router);
// app.use('/login/public-key/challenge', router);
// app.use('/signup/public-key/challenge', require('./public/js/register'));
// app.use('/login/public-key', require('./public/js/login'));
// app.use('/login/public-key/challenge', require('./public/js/login'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
