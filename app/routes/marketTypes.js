const express = require('express');
var jwt = require('jsonwebtoken');
const userValidation = require('../validators/user');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
let config = require('config');
const MarketType = require('../models/marketTypes');
const SubMarketType = require('../models/subMarketTypes');

const router = express.Router();
const loginRouter = express.Router();

function addMarketType(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  MarketType.findOne()
    .sort({ marketId: -1 })
    .exec((err, data) => {
      if (err)
        return res.status(404).send({ message: 'market type not found', err });
      const marketType = new MarketType(req.body);
      marketType.marketId = data ? data.marketId + 1 : 0;
      marketType.save((err, marketType) => {
        if (err && err.code === 11000) {
          if (err.keyPattern.name === 1)
            return res
              .status(404)
              .send({ message: 'market type already present' });
        }
        if (err || !marketType) {
          return res
            .status(404)
            .send({ message: 'market type not added', err });
        }
        return res.send({
          success: true,
          message: 'Market type added successfully',
          results: marketType,
        });
      });
    });
}

function addSubMarketTypes(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }
  MarketType.findOne({ marketId: req.body.marketId }, (err, data) => {
    if (err)
      return res.status(404).send({ message: 'market type not found', err });
    const subMarketType = new SubMarketType(req.body);
    subMarketType.marketId = data.marketId;
    subMarketType.save((err, marketType) => {
      if (err && err.code === 11000) {
        if (err.keyPattern.name === 1)
          return res
            .status(404)
            .send({ message: 'sub market type already present' });
      }
      if (err || !marketType) {
        return res
          .status(404)
          .send({ message: 'sub market type not added', err });
      }
      return res.send({
        success: true,
        message: 'Sub Market type added successfully',
        results: marketType,
      });
    });
  });
}

function getAllMarketTypes(req, res) {
  //to do if company is added two markets for its all users then
  // when that user login they can see only list of two markets

  MarketType.aggregate(
    [
      {
        $lookup: {
          from: 'submarkettypes',
          localField: 'marketId',
          foreignField: 'marketId',
          as: 'subMarketTypes',
        },
      },
    ],
    (err, results) => {
      if (err)
        return res
          .status(404)
          .send({ message: 'MARKET_TYPES_PAGINATION_FAILED' });
      return res.send({
        success: true,
        message: 'MARKET_TYPES_RECORD_FOUND',
        results: results,
      });
    }
  );
}

async function addAllowedMarketTypes(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }

  try {
    // Find all market types that are specified in the request body
    const marketIds = req.body.marketId;
    const marketTypes = await MarketType.find({
      marketId: { $in: marketIds },
    });
    // Check if all requested market types exist in the database
    const existingMarketIds = marketTypes.map(
      (marketType) => marketType.marketId
    );
    const missingMarketIds = marketIds.filter(
      (marketId) => !existingMarketIds.includes(marketId)
    );
    if (missingMarketIds.length > 0) {
      return res.status(404).send({
        message: `Market types not found: ${missingMarketIds.join(', ')}`,
      });
    }
    // Loop through each market type and find its related submarket types
    for (const marketType of marketTypes) {
      // Set the status of the market type to true
      marketType.status = 1;
      await marketType.save();
      // If specific submarkets are specified in the request body, update their status to true
      if (req.body.subMarketTypes) {
        const subMarketNames =
          req.body.subMarketTypes[marketType.marketId.toString()];
        if (subMarketNames) {
          const subMarketTypes = await SubMarketType.find({
            marketId: marketType.marketId,
            name: { $in: subMarketNames },
          });
          // Check if all requested submarket types exist in the database
          const existingSubMarketTypes = subMarketTypes.map(
            (subMarketType) => subMarketType.name
          );
          const missingSubMarketTypes = subMarketNames.filter(
            (subMarketName) => !existingSubMarketTypes.includes(subMarketName)
          );
          if (missingSubMarketTypes.length > 0) {
            return res.status(404).send({
              message: `Submarket types not found for market type '${
                marketType.name
              }': ${missingSubMarketTypes.join(', ')}`,
            });
          }
          // Update the status of the found submarket types to true
          await SubMarketType.updateMany(
            {
              marketId: marketType.marketId,
              name: { $in: subMarketNames },
              status: { $ne: 1 }, // only update submarkets whose status is not already set to 1
            },
            { status: 1 }
          );
        }
      }
      // Otherwise, set the status of all submarket types related to this market type to true
      else {
        await SubMarketType.updateMany(
          { marketId: marketType.marketId, status: { $ne: 1 } },
          { status: 1 }
        );
      }
    }
    // // Check if all market types were already updated, and return a message if they were
    // if (marketTypes.every((marketType) => marketType.status === 1)) {
    //   return res.status(404).send({
    //     message: 'All submarkets are already updated',
    //   });
    // }
    return res.send({
      success: true,
      message: 'Allowed market types updated successfully',
      results: marketTypes,
    });
  } catch (error) {
    console.error(error);
    return res.status(404).send({ message: 'Server error' });
  }
}

// async function editAllowedMarketTypes(req, res) {
//   const errors = validationResult(req);
//   if (errors.errors.length !== 0) {
//     return res.status(400).send({ errors: errors.errors });
//   }

//   try {
//     // Find all market types that are specified in the request body
//     const marketTypes = await MarketType.find({
//       marketId: { $in: req.body.marketId },
//     });
//     // Check if all requested market types exist in the database
//     const requestedMarketIds = req.body.marketId;
//     const existingMarketIds = marketTypes.map(
//       (marketType) => marketType.marketId
//     );
//     const missingMarketIds = requestedMarketIds.filter(
//       (marketId) => !existingMarketIds.includes(marketId)
//     );
//     if (missingMarketIds.length > 0) {
//       return res.status(404).send({
//         message: `Market types not found: ${missingMarketIds.join(', ')}`,
//       });
//     }
//     // Loop through each market type and find its related submarket types
//     for (const marketType of marketTypes) {
//       console.log('marketType.status', marketType.status);
//       // Set the status of the market type to true
//       // Check the status of the market type and submarket types
//       if (marketType.status == 1) {
//         marketType.status = 0;
//         await marketType.save();
//         // If specific submarkets are specified in the request body, update their status to true
//         if (req.body.subMarketTypes) {
//           const subMarketTypes = await SubMarketType.find({
//             marketId: marketType.marketId,
//             name: { $in: req.body.subMarketTypes },
//           });
//           // Check if all requested submarket types exist in the database
//           const requestedSubMarketTypes = req.body.subMarketTypes;
//           const existingSubMarketTypes = subMarketTypes.map(
//             (subMarketType) => subMarketType.name
//           );
//           const missingSubMarketTypes = requestedSubMarketTypes.filter(
//             (subMarketType) => !existingSubMarketTypes.includes(subMarketType)
//           );
//           if (missingSubMarketTypes.length > 0) {
//             return res.status(404).send({
//               message: `Submarket types not found for market type '${
//                 marketType.name
//               }': ${missingSubMarketTypes.join(', ')}`,
//             });
//           }
//           // Update the status of the found submarket types to true
//           await SubMarketType.updateMany(
//             {
//               marketId: marketType.marketId,
//               name: { $in: req.body.subMarketTypes },
//             },
//             { status: 0 }
//           );
//         }
//       }
//       // Otherwise, set the status of all submarket types related to this market type to true
//       else {
//         await SubMarketType.updateMany(
//           { marketId: marketType.marketId },
//           { status: 0 }
//         );
//       }
//     }
//     return res.send({
//       success: true,
//       message: 'Allowed market types updated successfully',
//       results: marketTypes,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).send({ message: 'Server error' });
//   }
// }
async function editAllowedMarketTypes(req, res) {
  const errors = validationResult(req);
  if (errors.errors.length !== 0) {
    return res.status(400).send({ errors: errors.errors });
  }

  try {
    // Find all market types that are specified in the request body
    const marketIds = req.body.marketId;
    const marketTypes = await MarketType.find({
      marketId: { $in: marketIds },
    });
    // Check if all requested market types exist in the database
    const existingMarketIds = marketTypes.map(
      (marketType) => marketType.marketId
    );
    const missingMarketIds = marketIds.filter(
      (marketId) => !existingMarketIds.includes(marketId)
    );
    if (missingMarketIds.length > 0) {
      return res.status(404).send({
        message: `Market types not found: ${missingMarketIds.join(', ')}`,
      });
    }
    // Loop through each market type and find its related submarket types
    for (const marketType of marketTypes) {
      // Set the status of the market type to true
      marketType.status = 0;
      await marketType.save();
      // If specific submarkets are specified in the request body, update their status to true
      if (req.body.subMarketTypes) {
        const subMarketNames =
          req.body.subMarketTypes[marketType.marketId.toString()];
        if (subMarketNames) {
          const subMarketTypes = await SubMarketType.find({
            marketId: marketType.marketId,
            name: { $in: subMarketNames },
          });
          // Check if all requested submarket types exist in the database
          const existingSubMarketTypes = subMarketTypes.map(
            (subMarketType) => subMarketType.name
          );
          const missingSubMarketTypes = subMarketNames.filter(
            (subMarketName) => !existingSubMarketTypes.includes(subMarketName)
          );
          if (missingSubMarketTypes.length > 0) {
            return res.status(404).send({
              message: `Submarket types not found for market type '${
                marketType.name
              }': ${missingSubMarketTypes.join(', ')}`,
            });
          }
          // Update the status of the found submarket types to true
          await SubMarketType.updateMany(
            {
              marketId: marketType.marketId,
              name: { $in: subMarketNames },
              status: { $ne: 0 }, // only update submarkets whose status is not already set to 0
            },
            { status: 0 }
          );
        }
      }
      // Otherwise, set the status of all submarket types related to this market type to true
      else {
        await SubMarketType.updateMany(
          { marketId: marketType.marketId, status: { $ne: 0 } },
          { status: 0 }
        );
      }
    }
    // // Check if all market types were already updated, and return a message if they were
    // if (marketTypes.every((marketType) => marketType.status === 1)) {
    //   return res.status(404).send({
    //     message: 'All submarkets are already updated',
    //   });
    // }
    return res.send({
      success: true,
      message: 'Allowed market types updated successfully',
      results: marketTypes,
    });
  } catch (error) {
    console.error(error);
    return res.status(404).send({ message: 'Server error' });
  }
}

loginRouter.get('/getAllMarketTypes', getAllMarketTypes);
loginRouter.post('/addMarketType', addMarketType);
loginRouter.post('/addSubMarketTypes', addSubMarketTypes);
loginRouter.post('/addAllowedMarketTypes', addAllowedMarketTypes);
loginRouter.post('/editAllowedMarketTypes', editAllowedMarketTypes);
module.exports = { router, loginRouter };
