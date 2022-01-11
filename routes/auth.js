const express = require('express');
const { check, body } = require('express-validator');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', authController.postLogin);

router.post('/signup', 
    [
        check('email').isEmail().withMessage('Please enter a valid email').normalizeEmail().custom((value,{req}) => { //normalizeEmail is a data sanitizer //check('email') will look for the email field anywhere in the incoming request
            if(value === 'test@test.com'){
                throw new Error('this email address is forbidden')
            }else{
                return true;
            }
        }),

        body('password', 'please password should contain atleast a number and 5 characters minimum').isLength({min: 5}).isAlphanumeric().trim(), //body('password') will look for the password field only in the body of the incoming request body(field, default error message to be used for all the chained validators)
        body('confirmPassword').trim().custom((value, {req}) => {
            if(value !== req.body.password){
                throw new Error('Passwords have to match')
            }else{
                return true;
            }
        })
    ], 
    authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset-password', authController.getReset);

router.post('/reset-password', authController.postReset);

router.get('/reset-password/:token', authController.getNewPassword);

router.post('/new-password', authController.postNewPassword);

module.exports = router;