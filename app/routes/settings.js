const express = require('express');
var jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Settings = require('../models/settings');
const User = require('../models/user');
const settingsValidation = require('../validators/settings');
const termsAndConditions = require('../models/termsAndConditions');
const PrivacyPolicy = require('../models/privacyPolicy');

const Exchanges = require('../models/exchanges');

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
          message: 'Default Login Page added successfully',
          results: loginPage,
        });
      }
    );
  });
}

function addTermsAndConditions(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  if (req.decoded.role !== '0') {
    return res
      .status(404)
      .send({ message: 'only company can add terms and conditions' });
  }

  let tncAndPrivacyPolicy = new termsAndConditions({
    termAndConditionsContent: req.body.termAndConditionsContent,
  });

  tncAndPrivacyPolicy.save((err, results) => {
    if (err || !results)
      return res.status(404).send({ message: 'Data Not Saved' });
    return res.send({
      success: true,
      message: 'Terms And Conditions Added Successfully',
      results: results,
    });
  });
}

function GetAllTermsAndConditions(req, res) {
  if (req.decoded.role !== '0') {
    return res
      .status(404)
      .send({ message: 'only company can see terms and conditions' });
  }
  termsAndConditions
    .findOne(
      {},
      { termAndConditionsContent: 1, createdAt: 1, updatedAt: 1, _id: 1 }
    )
    .sort({ _id: -1 })
    .exec((err, success) => {
      if (err || !success)
        return res.status(404).send({ message: 'Record Not Found' });
      else
        return res.send({
          success: true,
          message: 'Terms And Conditions Record Found',
          results: success,
        });
    });
}

function addPrivacyPolicy(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  if (req.decoded.role !== '0') {
    return res
      .status(404)
      .send({ message: 'only company can add privacy policies' });
  }
  let privacyPolicyContent = new PrivacyPolicy({
    privacyPolicyContent: req.body.privacyPolicyContent,
  });

  privacyPolicyContent.save((err, results) => {
    if (err || !results)
      return res.status(404).send({ message: 'Data Not Saved' });
    return res.send({
      success: true,
      message: 'Privacy Policy Added Successfully',
      results: results,
    });
  });
}

function GetAllPrivacyPolicy(req, res) {
  if (req.decoded.role !== '0') {
    return res
      .status(404)
      .send({ message: 'only company can see privacy policies' });
  }
  PrivacyPolicy.findOne(
    {},
    { privacyPolicyContent: 1, createdAt: 1, updatedAt: 1, _id: 1 }
  )
    .sort({ _id: -1 })
    .exec((err, success) => {
      if (err || !success)
        return res.status(404).send({ message: 'Record Not Found' });
      else
        return res.send({
          success: true,
          message: 'Privacy Policy Record Found',
          results: success,
        });
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
loginRouter.post(
  '/addTermsAndConditions',
  settingsValidation.validate('addTermsAndConditions'),
  addTermsAndConditions
);
loginRouter.get('/GetAllTermsAndConditions', GetAllTermsAndConditions);
loginRouter.post(
  '/addPrivacyPolicy',
  settingsValidation.validate('addPrivacyPolicy'),
  addPrivacyPolicy
);
loginRouter.get('/GetAllPrivacyPolicy', GetAllPrivacyPolicy);

module.exports = { loginRouter };
