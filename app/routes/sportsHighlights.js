// Import required modules
const express = require('express');
const { validationResult } = require('express-validator');
const loginRouter = express.Router();
const SportsHighlight = require('../models/sportsHighlights'); // import SportsHighlight model

// Define the API endpoint
async function getAllSportsHighlight(req, res) {
  try {
    // Find all sports highlights
    const sportsHighlights = await SportsHighlight.find();

    // Group sports highlights by sport type
    const sportsHighlightsBySport = {};
    sportsHighlights.forEach((highlight) => {
      if (sportsHighlightsBySport[highlight.sport]) {
        sportsHighlightsBySport[highlight.sport].push(highlight);
      } else {
        sportsHighlightsBySport[highlight.sport] = [highlight];
      }
    });

    // Send the response
    return res.send({
      success: true,
      message: 'GETTING_ALL_SPORTSHIGHLIGHT_DATA_SUCCESS',
      results: sportsHighlightsBySport,
    });
  } catch (err) {
    console.log(err);
    if (err) {
      return res.status(404).send({ message: 'Internal server error' });
    }
  }
}

loginRouter.get('/getAllSportsHighlight', getAllSportsHighlight);

module.exports = { loginRouter };
