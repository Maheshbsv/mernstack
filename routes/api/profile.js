const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth_middleware");
const { check, validationResult } = require("express-validator");
const axios = require("axios");
const config = require("config");
const normalize = require("normalize");
const request = require("request");

//Models
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const Posts = require("../../models/Post");

// @route   GET api/profile/me
// @desc    Profile route
// @access  Public
router.get("/me", auth, async (req, res) => {
  try {
    //Check if Profile exists
    const profile = await Profile.findOne({
      user: req.user.id
    }).populate("user", ["name", "avatar"]);

    if (!profile) {
      return res
        .status(500)
        .json({ msg: "[Profile Route]: Profile not found" });
    }

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Profile route: Server Error");
  }
});

// @route   POST api/profile
// @desc    Create or update user profile
// @access  Private
router.post(
  "/",
  [
    auth,
    [
      check("status", "Status is required")
        .not()
        .isEmpty(),
      check("skills", "Skills are required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("[profile]: Validation Error");
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin
    } = req.body;

    // Build profile object
    const profileFields = {};
    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (bio) profileFields.bio = bio;
    if (location) profileFields.location = location;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      profileFields.skills = skills.split(",").map(skill => skill.trim());
    }

    // Build Social object
    console.log(profileFields.skills);
    profileFields.social = {};
    if (youtube) profileFields.youtube = youtube;
    if (facebook) profileFields.facebook = facebook;
    if (twitter) profileFields.twitter = twitter;
    if (instagram) profileFields.instagram = instagram;
    if (linkedin) profileFields.linkedin = linkedin;

    // Update or Create the Profile in MongoDB

    try {
      // Check if Profile already exists and update data
      let profile = await Profile.findOne({ user: req.user.id });
      if (profile) {
        //Update the profile
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );

        return res.json(profile);
      }

      // Create a new profile
      profile = new Profile(profileFields);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error("[profile]update user profile", err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route   GET api/profile
// @desc    Get all profiles
// @access  Public
router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find().populate("user", ["name", "avatar"]);
    res.json(profiles);
  } catch (error) {
    console.error("[profile] Get all profile error", error.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user id
// @access  Public
router.get("/user/:user_id", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id
    }).populate("user", ["name", "avatar"]);

    if (!profile) return res.status(400).json({ msg: "Profile not found" });

    res.json(profile);
  } catch (error) {
    console.error("[profile] Get all profile error: ", error.message);
    if (error.kind === "ObjectId") {
      res.status(500).send("Profile not found");
    }
    res.status(500).send("Server Error");
  }
});

// @route   DELETE api/profile
// @desc    Delete profile, user & posts
// @access  Private
router.delete("/", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    if (!profile) return res.status(400).json({ msg: "Profile not found" });

    // Remove user prosts
    // Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });

    // Remvoe user
    await User.findOneAndRemove({ _id: req.user.id });
    res.json({ msg: "User deleted and profile data erased." });
  } catch (error) {
    console.error("[profile] Get all profile error: ", error.message);
    if (error.kind === "ObjectId") {
      res.status(500).send("Profile not found");
    }
    res.status(500).send("Server Error");
  }
});

// @route   PUT api/profile/experience
// @desc    Add profile experience
//@access   Private
router.put(
  "/experience",
  [
    auth,
    [
      check("title", "Title is required").notEmpty(),
      check("company", "Company is required").notEmpty(),
      check("from", "From date is required and has to be past date.").notEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    } = req.body;

    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });
      if (!profile) return res.status(400).json({ msg: "Profile not found" });
      profile.experience.unshift(newExp);
      await profile.save();
      res.json(profile);
    } catch (error) {
      console.error("[Add profile exprerience]: Server error");
    }
  }
);

// @route   DELETE api/profile/experience:exp_id
// @desc    Delete experience from profile
// @access  Private
router.delete("/experience:exp_id", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });

    if (!profile) return res.status(400).json({ msg: "Profile not found" });

    profile.experience = profile.experience.filter(
      (exp) => {
        exp._id.toString() !== req.params.exp_id
    });
    
    res.status(200).json(profile);
  } catch (error) {
    console.error("[profile]Delete Experience: ", error.message);
    if (error.kind === "ObjectId") {
      res.status(500).send("Experience in Profile not found");
    }
    res.status(500).send("Server Error");
  }
});

// @route    PUT api/profile/education
// @desc     Add profile education
// @access   Private
router.put(
  '/education',
  [
    auth,
    [
      check('school', 'School is required')
        .not()
        .isEmpty(),
      check('degree', 'Degree is required')
        .not()
        .isEmpty(),
      check('fieldofstudy', 'Field of study is required')
        .not()
        .isEmpty(),
      check('from', 'From date is required and needs to be from the past')
        .not()
        .isEmpty()
        .custom((value, { req }) => (req.body.to ? value < req.body.to : true))
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    } = req.body;

    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    };

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(newEdu);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/profile/education/:edu_id
// @desc     Delete education from profile
// @access   Private

router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    const foundProfile = await Profile.findOne({ user: req.user.id });
    foundProfile.education = foundProfile.education.filter(
      edu => edu._id.toString() !== req.params.edu_id
    );
    await foundProfile.save();
    return res.status(200).json(foundProfile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET api/profile/github/:username
// @desc    Get user repos from Github
// @access  Public
router.get("/github/:username", async (req, res) => {
  // try {
  //   const uri = encodeURI(
  //     `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
  //   );

  //   const headers = {
  //     'user-agent': "node.js",
  //     Authorization: `token ${config.get('githubSecret')}`
  //   }

  //   const gitHubResponse = await axios.get(uri,{ headers });
  //   console.log(gitHubResponse);
  //   return res.json(gitHubResponse.data);

  // } catch (error) {
  //   console.error(error.message);
  //   return res.status(404).json({ msg: 'No Github profile found' });
  // }

  try {
    const options = {
      uri: `https://api.github.com/users/${
        req.params.username
      }/repos?per_page=5&sort=created:asc&client_id=${
        config.get('githubClientId')
      }&client_secret=${
        config.get('githubSecret')}`,
      method: 'GET',
      headers: { 'user-agent': 'node.js'}
    };

    request(options, (error, response, body) => {
      if(error) console.error(error);

      if(response.statusCode !== 200){
        return res.status(404).json({msg: 'No Github profile'})
      }

      res.json(JSON.parse(body));
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});


module.exports = router;
