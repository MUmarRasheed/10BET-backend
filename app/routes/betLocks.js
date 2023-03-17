const express = require("express");
const { validationResult } = require("express-validator");
let config = require("config");
const BetLock = require("../models/betLocks");
const betLockValidation = require("../validators/user");
const User = require("../models/user");
const loginRouter = express.Router();

function addBetLock(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }

  const selectedUsers = req.body.selectedUsers;
  const allUsers = req.body.allUsers;

  let query = {};
  if (req.decoded.login.role === "1") {
    query.superAdminId = req.decoded.userId;
  } else if (req.decoded.login.role === "2") {
    query.parentId = req.decoded.userId;
  } else if (req.decoded.login.role === "3") {
    query.adminId = req.decoded.userId;
  } else if (req.decoded.login.role === "4") {
    query.masterId = req.decoded.userId;
  }

  let usersPromise;

  if (allUsers) {
    usersPromise = User.find(query);
    return usersPromise
      .then((foundUsers) => {
        const userIds = foundUsers.map((user) => user.userId);
        BetLock.findOne({ "users.userId": { $in: userIds } })
          .then((existingBetlock) => {
            if (existingBetlock) {
              const existingUserIds = existingBetlock.users.map(
                (user) => user.userId
              );
              const conflictingUserIds = userIds.filter((userId) =>
                existingUserIds.includes(userId)
              );
              return res.status(404).send({
                message: `Betlock already exists for user(s) with UserId(s) ${conflictingUserIds.join(
                  ", "
                )}`,
              });
            }
            const betlock = new BetLock({
              users: foundUsers.map((user) => ({
                user: user._id,
                selected: true,
                userName: user.userName,
                userId: user.userId,
              })),
            });
            betlock.save((err) => {
              if (err) {
                console.error(err);
                return res.status(404).send({ message: "Bet lock not saved" });
              }
              return res.send({
                success: true,
                message: "Betlock created successfully",
                results: betlock,
              });
            });
          })
          .catch((err) => {
            console.error(err);
            return res.status(404).send({ message: "Error in fetching users" });
          });
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send({ message: "error in saving bet lock" });
      });
  } else {
    usersPromise = User.find({ userId: { $in: selectedUsers }, ...query });
    usersPromise
      .then((foundUsers) => {
        if (foundUsers.length !== selectedUsers.length) {
          return res
            .status(404)
            .send({ message: "One or more users not found" });
        }
        const userIds = foundUsers.map((user) => user.userId);
        BetLock.findOne({ "users.userId": { $in: userIds } })
          .then((existingBetlock) => {
            if (existingBetlock) {
              const existingUserIds = existingBetlock.users.map(
                (user) => user.userId
              );
              const conflictingUserIds = userIds.filter((userId) =>
                existingUserIds.includes(userId)
              );
              return res.status(404).send({
                message: `Betlock already exists for user(s) with UserId(s) ${conflictingUserIds.join(
                  ", "
                )}`,
              });
            }
            const betlock = new BetLock({
              users: foundUsers.map((user) => ({
                user: user._id,
                selected: true,
                userName: user.userName,
                userId: user.userId,
              })),
            });
            betlock.save((err) => {
              if (err) {
                console.error(err);
                return res.status(404).send({ message: "Bet lock not saved" });
              }
              return res.send({
                success: true,
                message: "Betlock created successfully",
                results: betlock,
              });
            });
          })
          .catch((err) => {
            console.error(err);
            return res.status(404).send({ message: "Error in fetching users" });
          });
      })
      .catch((err) => {
        console.error(err);
        res.status(404).send({ message: "error in saving bet lock" });
      });
  }
}

loginRouter.post("/addBetLock", addBetLock);

module.exports = { loginRouter };
