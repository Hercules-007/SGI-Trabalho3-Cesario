const express = require('express');
const passport = require('passport');
const router = express.Router();
const crypto = require('crypto');
// const WebAuthnStrategy = require('passport-fido2-webauthn').Strategy;
const WebAuthnStrategy = require('passport-fido2-webauthn');
const SessionChallengeStore = require('passport-fido2-webauthn').SessionChallengeStore;
const base64url = require('base64url');
var uuid = require('uuid').v4;
const bodyParser = require('body-parser');

const app = express();

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

var store = new SessionChallengeStore();

// const WebAuthnStrategy = require('passport-webauthn');
const User = require('../models/User');
const PublicKeyCredential = require('../models/PublicKeyCredential');

// Rota para autenticação com Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

//Callback de autenticação com Google
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  res.redirect('/dashboard');
});

// Rota para logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect('/');
  });
});

// WebAuthn

passport.use(new WebAuthnStrategy({ store: store },{
  publicKey: async (id, userHandle) => {
    try {
      // Find the public key credential by external_id
      const publicKeyCredential = await PublicKeyCredential.findOne({ external_id: id }).exec();
      
      if (!publicKeyCredential) {
        return { valid: false, message: 'Invalid key.' };
      }

      // Find the user associated with the public key credential
      const user = await User.findById(publicKeyCredential.user_id).exec();

      if (!user) {
        return { valid: false, message: 'Invalid key.' };
      }

      // Compare user handle (assuming it's stored as Buffer in the database)
      if (!user.handle || Buffer.compare(user.handle, userHandle) !== 0) {
        return { valid: false, message: 'Invalid key.' };
      }

      // Return the user and public key
      return { valid: true, user: user, publicKey: publicKeyCredential.public_key };
    } catch (err) {
      return { valid: false, message: err.message };
    }
  },
  register: async (user, id, publicKey) => {
    try {
      // Update user with handle and other details
      const updatedUser = await User.findOneAndUpdate(
        { googleId: user.googleId },
        { handle: user.id },
        { new: true, upsert: true }
      );

      // Save the public key credential
      await PublicKeyCredential.create({
        user_id: updatedUser._id,
        external_id: id,
        public_key: publicKey
      });

      return updatedUser;
    } catch (err) {
      throw err;
    }
  }
}));

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user._id, username: user.username });
  });
});

passport.deserializeUser(async function(user, cb) {
  try {
    const foundUser = await User.findById(user.id).exec();
    cb(null, foundUser);
  } catch (err) {
    cb(err);
  }
});

router.post('/login/public-key', passport.authenticate('webauthn', {
  failureMessage: true,
  failWithError: true
}), function(req, res, next) {
  res.json({ ok: true, location: '/' });
}, function(err, req, res, next) {
  var cxx = Math.floor(err.status / 100);
  if (cxx != 4) { return next(err); }
  res.json({ ok: false, location: '/login' });
});

router.post('/login/public-key/challenge', function(req, res, next) {
  // Assuming store.challenge is a function that generates a challenge
  store.challenge(req, async function(err, challenge) {
    if (err) { return next(err); }

    try {
      // Example of querying MongoDB with Mongoose
      const publicKeyCredential = await PublicKeyCredential.findOne({ /* query conditions */ }).exec();
      if (!publicKeyCredential) {
        return res.status(404).json({ error: 'Public key credential not found.' });
      }

      // Encode the challenge as base64url
      const encodedChallenge = base64url.encode(challenge);

      // Respond with the encoded challenge
      res.json({ challenge: encodedChallenge });
    } catch (error) {
      next(error); // Pass any errors to the error handler
    }
  });
});

// router.post('/signup/public-key/challenge', async function(req, res, next) {
//   try {
//     // Generate a unique handle (if needed)
//     const handle = Buffer.alloc(16);
//     const userId = uuid({}, handle);
    
//     const { username, email, googleId } = req.body;
//     if (!username || !email || !googleId) {
//       console.log('Missing required fields:', req.body);
//       return res.status(400).json({ error: 'Missing required fields.' });
//     }

//     // Create a new user document (assuming req.body contains necessary data)
//     const newUser = new User({
//       googleId: req.body.googleId,
//       username: req.body.username,
//       email: req.body.email,
//       handle: userId,
//     });

//     // Save the new user to MongoDB
//     await newUser.save();

//     // Example of querying MongoDB with Mongoose
//     const publicKeyCredential = await PublicKeyCredential.findOne({ /* query conditions */ }).exec();
//     if (!publicKeyCredential) {
//       return res.status(404).json({ error: 'Public key credential not found.' });
//     }

//     // Assuming store.challenge is a function that generates a challenge
//     store.challenge(req, { user: newUser }, function(err, challenge) {
//       if (err) { return next(err); }

//       // Encode the user id and challenge as base64url
//       const encodedUserId = base64url.encode(newUser.id);
//       const encodedChallenge = base64url.encode(challenge);

//       // Respond with the encoded user and challenge
//       res.json({ user: { id: encodedUserId, name: newUser.name }, challenge: encodedChallenge });
//     });
//   } catch (error) {
//     next(error); // Pass any errors to the error handler
//   }
// });

// Function to generate a challenge
function generateChallenge() {
  return crypto.randomBytes(32).toString('base64');
}

router.post('/signup/public-key/challenge', async function(req, res, next) {
  try {
    // Generate a unique handle
    const handle = Buffer.alloc(16);
    const userId = uuid({}, handle);

    const { username, email, googleId } = req.body;
    if (!username || !email || !googleId) {
      console.log('Missing required fields:', req.body);
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Create a new user document
    const newUser = new User({
      googleId: googleId,
      username: username,
      email: email,
      handle: userId,
    });

    // Save the new user to MongoDB
    await newUser.save();

    // Query for the public key credential (adjust as per your requirements)
    const publicKeyCredential = await PublicKeyCredential.findOne({ googleId: googleId }).exec();
    if (!publicKeyCredential) {
      return res.status(404).json({ error: 'Public key credential not found.' });
    }

    // Generate a challenge
    const challenge = generateChallenge();

    // Encode the user id and challenge as base64url
    const encodedUserId = base64url.encode(newUser._id.toString()); // Use newUser._id
    const encodedChallenge = base64url.encode(challenge);

    // Respond with the encoded user and challenge
    res.json({ user: { id: encodedUserId, name: newUser.username }, challenge: encodedChallenge });
  } catch (error) {
    next(error); // Pass any errors to the error handler
  }
});
module.exports = router;
