const express = require('express');
const { CreateError } = require('../utils');
const route = express.Router();

route.get(
    '/',

    async (req, res, next) => {

        res.render('docs/');        
        
    }
)

module.exports = route;