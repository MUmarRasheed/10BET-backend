const express = require('express');
const { validationResult } = require('express-validator');
let config = require('config');
const BetLock = require('../models/betLocks');
const betLockValidator = require('../validators/betLocks');
const User = require('../models/user');
const loginRouter = express.Router();

// async function addBetLock(req, res) {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).send({ errors: errors.errors });
//     }

//     const selectedUsers = req.body.selectedUsers;
//     const allUsers = req.body.allUsers;

//     let query = {};
//     if (req.decoded.login.role === '1') {
//       query.superAdminId = req.decoded.userId;
//     } else if (req.decoded.login.role === '2') {
//       query.parentId = req.decoded.userId;
//     } else if (req.decoded.login.role === '3') {
//       query.adminId = req.decoded.userId;
//     } else if (req.decoded.login.role === '4') {
//       query.masterId = req.decoded.userId;
//     }

//     let foundUsers;
//     if (allUsers) {
//       foundUsers = await User.find(query).select('_id userId userName');
//       const userIds = foundUsers.map((user) => user.userId);
//       const existingBetlock = await BetLock.findOne({
//         'users.userId': { $in: userIds },
//       });
//       if (existingBetlock) {
//         return res.status(404).send({
//           message: `Betlock already exists for all users`,
//         });
//       }
//       if (existingBetlock) {
//         const existingUserIds = existingBetlock.users.map(
//           (user) => user.userId
//         );
//         const conflictingUserIds = userIds.filter((userId) =>
//           existingUserIds.includes(userId)
//         );
//         if (conflictingUserIds.length === userIds.length) {
//           // All users are already part of an existing betlock
//           return res.status(404).send({
//             message: `All users are already part of an existing betlock`,
//           });
//         }
//         const newUsersIds = userIds.filter(
//           (userId) => !existingUserIds.includes(userId)
//         );
//         const betlock = new BetLock({
//           users: foundUsers
//             .filter((user) => newUsersIds.includes(user.userId))
//             .map((user) => ({
//               user: user._id,
//               selected: true,
//               userName: user.userName,
//               userId: user.userId,
//             })),
//         });
//         await betlock.save();
//         return res.send({
//           success: true,
//           message: 'Betlock created successfully',
//           results: betlock,
//         });
//       }
//     } else {
//       foundUsers = await User.find({
//         userId: { $in: selectedUsers },
//         ...query,
//       }).select('_id userId userName');
//       if (foundUsers.length !== selectedUsers.length) {
//         return res.status(404).send({ message: 'One or more users not found' });
//       }
//       const userIds = foundUsers.map((user) => user.userId);
//       const existingBetlock = await BetLock.findOne({
//         'users.userId': { $in: userIds },
//       });
//       if (existingBetlock) {
//         const existingUserIds = existingBetlock.users.map(
//           (user) => user.userId
//         );
//         const conflictingUserIds = userIds.filter((userId) =>
//           existingUserIds.includes(userId)
//         );
//         return res.status(404).send({
//           message: `Betlock already exists for user(s) with UserId(s) ${conflictingUserIds.join(
//             ', '
//           )}`,
//         });
//       }
//     }
//     const betlock = new BetLock({
//       users: foundUsers.map((user) => ({
//         user: user._id,
//         selected: true,
//         userName: user.userName,
//         userId: user.userId,
//       })),
//     });

//     await betlock.save();
//     return res.send({
//       success: true,
//       message: 'Betlock created successfully',
//       results: betlock,
//     });
//   } catch (err) {
//     res.status(404).send({ message: 'betlock not saved' });
//   }
// }

async function addBetLock(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).send({ errors: errors.errors });
    }

    const selectedUsers = req.body.selectedUsers || [];
    const allUsers = req.body.allUsers || false;

    let query = {};
    if (req.decoded.login.role === '1') {
      query.superAdminId = req.decoded.userId;
    } else if (req.decoded.login.role === '2') {
      query.parentId = req.decoded.userId;
    } else if (req.decoded.login.role === '3') {
      query.adminId = req.decoded.userId;
    } else if (req.decoded.login.role === '4') {
      query.masterId = req.decoded.userId;
    }

    let foundUsers = [];
    if (allUsers) {
      foundUsers = await User.find(query).select('_id userId userName');
      const userIds = foundUsers.map((user) => user.userId);
      const existingBetlock = await BetLock.findOne({
        'users.userId': { $in: userIds },
      });
      if (existingBetlock) {
        return res.status(404).send({
          message: `Betlock already exists for all users`,
        });
      }
      // update the isBettingAllowed field to false for all users
      await User.updateMany(query, { $set: { bettingAllowed: false } });
    } else if (selectedUsers.length > 0) {
      foundUsers = await User.find({
        userId: { $in: selectedUsers },
        ...query,
      }).select('_id userId userName');
      if (foundUsers.length !== selectedUsers.length) {
        return res.status(404).send({ message: 'One or more users not found' });
      }
      const userIds = foundUsers.map((user) => user.userId);
      const existingBetlock = await BetLock.findOne({
        'users.userId': { $in: userIds },
      });
      if (existingBetlock) {
        const existingUserIds = existingBetlock.users.map(
          (user) => user.userId
        );
        const conflictingUserIds = userIds.filter((userId) =>
          existingUserIds.includes(userId)
        );
        return res.status(404).send({
          message: `Betlock already exists for user(s) with UserId(s) ${conflictingUserIds.join(
            ', '
          )}`,
        });
      }
      // update the isBettingAllowed field to false for selected users
      await User.updateMany(
        { userId: { $in: selectedUsers }, ...query },
        { $set: { bettingAllowed: false } }
      );
    }

    const betlock = new BetLock({
      users: foundUsers.map((user) => ({
        user: user._id,
        selected: true,
        userName: user.userName,
        userId: user.userId,
      })),
    });

    await betlock.save();
    return res.send({
      success: true,
      message: 'Betlock created successfully',
      results: betlock,
    });
  } catch (err) {
    res.status(404).send({ message: 'betlock not saved' });
  }
}

loginRouter.post(
  '/addBetLock',
  betLockValidator.validate('addBetLock'),
  addBetLock
);

module.exports = { loginRouter };
