const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');

//Import User Model 
const User = require('../../models/User');

// @route   GET api/users
// @desc    Test route
// @access  Public
router.post('/', [
    // username must be an email
    check('name', 'Name is required').notEmpty(),
    // password must be at least 5 chars long
    check('password', 'Password must be at least 5 characters long and required').isLength({ min: 5 }),
    // email must be included
    check('email', 'Email is required').isEmail(),
], 
async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
    }
    const {name, email, password} = req.body;
    
    try {

        //Check first if User exists in Database
        let user = await User.findOne({ email });
        if (user) {
            res.status(400).json({errors: [{ msg: 'User already exists'}] });
        }

        const avatar = gravatar.url(email, {
            s: '200',
            r: 'pg',
            d: 'mm'
        })

        user = new User({
            name,
            email,
            avatar,
            password
        });

        //Encrypt Password
        const salt = await bcrypt.genSalt(10);
        
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        //Return JSON Web Token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload,
            config.get('jwtToken'),
            {expiresIn: 360000},
            (err, token) => {
                if(err) throw err;
                res.json({token});
            }
        );
    } catch(err) {
        console.error(err.message);
        return res.status(500).send('[User Registration]:Server Error');
    }
    
    //res.send('User is registered.');
    
});

module.exports = router;


