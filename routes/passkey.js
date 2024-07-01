const express = require('express');
const router = express.Router();
const passport = require('passport');
const { ensureAuthenticated } = require('../middleware/auth');

// Rota para a página de registo
router.get('/register', ensureAuthenticated, (req, res) => {
  res.render('register', { user: req.user });
});

// Rota para a página de autenticação
// router.get('/login', (req, res) => {
//   res.render('login', { user: req.user });
// });


module.exports = router;
