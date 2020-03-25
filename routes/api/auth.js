const express = require('express');
const auth = require('../../middleware/auth_middleware');
const router = express.Router();
const User = require('../../models/User');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('config');

// @route   GET api/auth
// @desc    Test route
// @access  Public
router.get('/', auth, async (req, res) => {

    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('[Auth]: Server Error, user not found.');
    }
});

// @route   GET api/auth
// @desc    Authenticate user and get token
// @access  Public
router.post('/', [
    check('password', 'Password is required').isLength({ min: 5 }),
    check('email', 'Email is required').isEmail(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { email, password } = req.body;

    try {
        //Check first if User exists in Database
        let user = await User.findOne({ email });
        if (!user) {
            return res
            .status(400)
            .json({ errors: [{ msg: 'Invalid Credentials' }] });
        }

        // Check if password matches

        const isMatch = await bcrypt.compare(password, user.password);

        if(!isMatch) {
            return res
            .status(400)
            .json({ errors: [{ msg: 'Invalid Credentials' }] });
        }
        //Return JSON Web Token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload,
            config.get('jwtToken'),
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('[User Auth]:Server Error');
    }

    //res.send('User is registered.');

});


module.exports = router;