const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  handle: {
    type: Buffer,
    required: false  // Can be added later
  }
});

module.exports = mongoose.model('User', UserSchema);
