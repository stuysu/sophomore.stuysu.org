const express = require('express');
const router = express.Router();

const { Op } = require('sequelize');

const { Sheets, Attributes } = require('./../models').sequelize.models;
const { CreateError } = require('./utils');

/**
 * GET STUDY SHEETS
 * 
 * if id is given, get post by that id
 * 
 * if id is not given, look for study sheeet with any of
 * the following matching:
 *  - title
 *  - author
 *  - teacher
 *  - subject
 *  - keyword
 * 
 * this always enforces an OR rather than an AND query
 * type which seems kind of weird.
 * 
 */
router.get(

    '/sheets',

    async (req, res, next) => {

        try {
            // if id is present, give sheet with that id
            if (req.query.id) {

                let sheet = await Sheets.findByPk(req.query.id);
                res.status(200).json(sheet ? sheet : {});

            }

            else {

                // create an or query for title, author, teacher, subject
                let orQuery = [];

                // look away
                if (req.query.title) orQuery.push({ title: { [Op.like]: `%${req.query.title}%` } });
                if (req.query.author) orQuery.push({ author: { [Op.like]: `%${req.query.author}%` } });
                if (req.query.teacher) orQuery.push({ teacher: { [Op.like]: `%${req.query.teacher}` } });
                if (req.query.subject) orQuery.push({ subject:  { [Op.like]: `%${req.query.subject}` }});

                let sheets = await Sheets.findAll({
                    where: (orQuery.length === 0 && !req.query.keyword) ? {} : { [Op.or]: orQuery }
                });

                // if a keyword is present, add it to th sheets (avoid duplicates)
                if (req.query.keyword) {

                    let sheetIds = new Set();
                    // go by sheet id's because javascript equality is idk
                    sheets.forEach(sheet => { sheetIds.add(sheet.id); });

                    // look up keywords 
                    let associatedSheets = await Attributes.findAll({
                        where: {
                            keyword: {
                                [Op.like]: `%${req.query.keyword}%`
                            }
                        },
                        include: Sheets
                    });

                    console.log(associatedSheets);

                    // if the sheet hasn't been used yet, add it
                    associatedSheets.forEach(attribute => {
                        if (!sheetIds.has(attribute.Sheet.id))
                            sheets.push(attribute.Sheet);
                    });


                }

                res.status(200).json(sheets);

            }

        } catch (err) {

            next(CreateError(400, err));

        }

    }

);

/**
 * GET SHEET KEYWORDS
 */
router.get(

    '/sheets/keywords',

    async (req, res, next) => {

        try {
            // get by id first
            if (req.query.id) {

                let attribute = await Attributes.findOne({ where: { id: req.query.id } });
                res.status(200).json(attribute ? attribute : {});

            }
            else {

                let query = {};

                if (req.query.sheetId) query.SheetId = req.query.sheetId;
                if (req.query.keyword) query.keyword = { [Op.like]: `%${req.query.keyword}%` };

                let keywords = await Attributes.findAll({ where: query });
                res.status(200).json(keywords);

            }
        } catch (err) {
            next(CreateError(400, err));
        }

    }

);

/**
 * UPDATE A SHEET KEYWORD
 */
router.put(

    '/sheets/keywords',

    async (req, res, next) => {

        if (req.body.id === undefined) {
            next(CreateError(400, 'Need an attribute id to process request'));
        }

        try {
            let instance = await Attributes.findByPk(req.body.id);

            let result = {
                found: instance !== null
            };

            if (result.found) {

                const options = { where: { id: req.body.id } };

                result.old = {
                    keyword: req.body.keyword !== undefined ? instance.keyword : undefined
                };

                await Attributes.update({
                    keyword: req.body.keyword
                }, options);

                result.keyword = req.body.keyword;

            }

            res.status(200).json(result);

        } catch (err) {
            next(CreateError(400, err));
        }

    }

);

/**
 * UPDATE A SHEET
 */
router.put(

    '/sheets',

    async (req, res, next) => {

        try {

            let instance = await Sheets.findByPk(req.body.id);

            let result = {
                found: instance !== null
            };

            if (result.found) {

                const options = { where: { id: req.body.id } };

                result.old = {
                    url: req.body.url !== undefined ? instance.url : undefined,
                    subject: req.body.subject !== undefined ? instance.subject : undefined,
                    title: req.body.title !== undefined ? instance.title : undefined,
                    author: req.body.author !== undefined ? instance.author : undefined,
                    teacher: req.body.teacher !== undefined ? instance.teacher : undefined
                };

                await Sheets.update({
                    url: req.body.url,
                    author: req.body.author,
                    title: req.body.title,
                    subject: req.body.subject,
                    teacher: req.body.teacher
                }, options);

                result.url = req.body.url;
                result.subject = req.body.subject;
                result.title = req.body.title;
                result.author = req.body.author;
                result.teacher = req.body.teacher;
            }
            
            res.status(200).json(result);

        } catch (err) {

            next(CreateError(400, err));

        }

    }

);

/**
 * ADD A KEYWORD TO A SHEET
 */
router.post(

    '/sheets/keywords',

    async (req, res, next) => {

        if (req.body.id === undefined) {
            next(CreateError(400, `Sheet id not found, but is required`))
        }

        try {

            let attribute = await Attributes.create({
                keyword: req.body.keyword,
                SheetId: req.body.id
            });

            res.status(200).json({
                created: true,
                keyword: req.body.keyword,
                id: req.body.id
            });



        } catch (err) {
            next(CreateError(400, err));
        }

    }
);

/**
 * ADD A SHEET
 */
router.post(

    '/sheets',

    async (req, res, next) => {

        if (req.body.url === undefined) {

            next(CreateError(400, 'Sheet url not found, but is required'));

        }

        try {
            let instance = await Sheets.create({
                url: req.body.url,
                title: req.body.title,
                author: req.body.author,
                subject: req.body.subject,
                teacher: req.body.teacher
            });

            res.status(200).json({
                created: true,
                url: req.body.url,
                title: req.body.title,
                author: req.body.author,
                subject: req.body.subject,
                teacher: req.body.teacher
            });

        } catch (err) {
            next(CreateError(400, err));
        }

    }

);

/**
 * DELETE A SHEET 
 * 
 * TODO: does this delete associated study sheetes?
 */
router.delete(

    '/sheets/:id',

    async (req, res, next) => {

        try {
            let wasDeleted = await Sheets.destroy({ where: { id : req.params.id }});
            res.status(200).json({
                deleted: wasDeleted == 1,
                id: req.params.id
            });
        } catch (err) {
            next(CreateError(400, err));
        }

    }
    
);
// delete reqeuest on /sheets/

/**
 * DELETE A KEYWORD
 */
router.delete(

    '/sheets/keywords/:id',

    async (req, res, next) => {

        try {
            let wasDeleted = await Attributes.destroy({ where: { id : req.params.id }});
            res.status(200).json({
                deleted: wasDeleted == 1,
                id: req.params.id
            });
        } catch (err) {
            next(CreateError(400, err));
        }

    }
    
);
// delete request on /sheets/keywords

module.exports = router;