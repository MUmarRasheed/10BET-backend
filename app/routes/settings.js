const express = require('express');
var jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Settings = require('../models/settings');
const User = require('../models/user');
const settingsValidation = require('../validators/settings');

const loginRouter = express.Router();

function updateDefaultTheme(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  if (req.decoded.role !== '0') {
    return res
      .status(404)
      .send({ message: 'only company can add default theme' });
  }
  User.findOne({ role: req.decoded.role }, (err, user) => {
    if (err || !user) {
      return res.status(404).send({ message: 'User not found' });
    }
    Settings.findOneAndUpdate(
      { defaultThemeName: req.body.oldThemeName },
      { $set: { defaultThemeName: req.body.newThemeName } },
      { new: true },
      (err, theme) => {
        if (err || !theme) {
          return res.status(404).send({ message: 'theme not found' });
        }
        if (req.body.oldThemeName === req.body.newThemeName) {
          return res
            .status(404)
            .send({ message: 'both theme name cannot be same' });
        }
        return res.send({
          success: true,
          message: 'Theme added successfully',
          results: theme,
        });
      }
    );
  });
}

function updateDefaultLoginPage(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  if (req.decoded.role !== '0') {
    return res
      .status(404)
      .send({ message: 'only company can add default login page' });
  }
  User.findOne({ role: req.decoded.role }, (err, user) => {
    if (err || !user) {
      return res.status(404).send({ message: 'User not found' });
    }

    Settings.findOneAndUpdate(
      { defaultLoginPage: req.body.oldLoginPage },
      { $set: { defaultLoginPage: req.body.newLoginPage } },
      { new: true },
      (err, loginPage) => {
        if (err || !loginPage) {
          return res.status(404).send({ message: 'loginPage not found' });
        }
        if (req.body.oldLoginPage === req.body.newLoginPage) {
          return res
            .status(404)
            .send({ message: 'both loginPage cannot be same' });
        }
        return res.send({
          success: true,
          message: 'Theme added successfully',
          results: loginPage,
        });
      }
    );
  });
}

loginRouter.post(
  '/updateDefaultTheme',
  settingsValidation.validate('updateDefaultTheme'),
  updateDefaultTheme
);
loginRouter.post(
  '/updateDefaultLoginPage',
  settingsValidation.validate('updateDefaultLoginPage'),
  updateDefaultLoginPage
);

module.exports = { loginRouter };
