const express = require("express");
const { CreateError, analyticsOn } = require("../utils");
const route = express.Router();

route.get(
    "/",

    analyticsOn(
        "Home Page",

        async (req, res, next) => {
            res.redirect("/links");
        }
    )
);

module.exports = route;
