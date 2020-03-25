const express = require('express');
const router = express.Router();

const auth = require('../../middleware/auth_middleware');

const User = require('../../models/User');
const Profile = require('../../models/Profile');

// @route   GET api/profile/me
// @desc    Profile route
// @access  Public
router.get('/me', auth, async (req, res) => {
    try {
        //Check if Profile exists
        const profile = await (await Profile.findOne({ user: req.user.id })).populate('user', 
        ['name', 'avatar']);

        if(!profile) {
            return res.status(500).json({msg: "[Profile Route]: Profile not found"});
        }
    
        res.json({profile});

    } catch(err) {
        console.error(err.message);
        res.status(500).send("Profile route: Server Error");
    }

});

module.exports = router;