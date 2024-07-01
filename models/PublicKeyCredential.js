const mongoose = require('mongoose');

const PublicKeyCredentialSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  external_id: {
    type: String,
    required: true
  },
  public_key: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('PublicKeyCredential', PublicKeyCredentialSchema);
