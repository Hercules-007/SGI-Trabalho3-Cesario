const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const User = require('../models/User');
const Fido2Strategy = require('passport-fido2-webauthn').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://sgi-trabalho3-cesario.vercel.app/auth/google/callback'
  // callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  const newUser = {
    googleId: profile.id,
    username: profile.displayName,
    email: profile.emails[0].value
  };

  try {
    let user = await User.findOne({ googleId: profile.id });
    if (user) {
      return done(null, user);
    } else {
      user = await User.create(newUser);
      return done(null, user);
    }
  } catch (err) {
    console.error(err);
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


// Configuração do WebAuthn
passport.use(new Fido2Strategy(
  async (user, done) => {
    // Implementar busca de credenciais do usuário no banco
    const credentials = await findUserCredentials(user.email);
    done(null, credentials);
  },
  async (user, challenge, done) => {
    // Implementar verificação do challenge
    const isValid = await verifyUserChallenge(user.email, challenge);
    done(null, isValid);
  }
));
