const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../logger");
const connectToDatabase = require("../models/db");

//Task 1: Use the `body`,`validationResult` from `express-validator` for input validation
const { body, validationResult } = require('express-validator');


const JWT_SECRET = process.env.JWT_SECRET;

// POST /register
router.post("/register", async (req, res) => {
  try {
    // Task 1: Connect to MongoDB
    const db = await connectToDatabase();

    // Task 2: Access users collection
    const collection = db.collection("users");

    // Task 3: Check if email already exists
    const existingEmail = await collection.findOne({ email: req.body.email });
    if (existingEmail) {
      logger.error("Email id already exists");
      return res.status(400).json({ error: "Email id already exists" });
    }

    // Task 4: Hash password
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash(req.body.password, salt);

    // Task 5: Insert user into DB
    const newUser = await collection.insertOne({
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: hash,
      createdAt: new Date(),
    });

    // Task 6: Create JWT token
    const payload = { user: { id: newUser.insertedId } };
    const authtoken = jwt.sign(payload, JWT_SECRET);

    // Task 7: Log successful registration
    logger.info("User registered successfully");

    // Task 8: Return email & token
    res.json({ authtoken, email: req.body.email });
  } catch (e) {
    logger.error(`Error registering user: ${e.message}`);
    return res.status(500).send("Internal server error");
  }
});

router.post('/login', async (req, res) => {
    try {
        // Task 1: Connect to MongoDB
        const db = await connectToDatabase();

        // Task 2: Access users collection
        const collection = db.collection("users");

        // Task 3: Check for user credentials in database
        const theUser = await collection.findOne({ email: req.body.email });

        // Task 7: Send message if user not found
        if (!theUser) {
            logger.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }

        // Task 4: Check password match
        const passwordMatch = await bcryptjs.compare(req.body.password, theUser.password);
        if (!passwordMatch) {
            logger.error('Passwords do not match');
            return res.status(404).json({ error: 'Wrong password' });
        }

        // Task 5: Fetch user details
        const userName = theUser.firstName;
        const userEmail = theUser.email;

        // Task 6: Create JWT token
        const payload = {
            user: { id: theUser._id.toString() }
        };
        const authtoken = jwt.sign(payload, JWT_SECRET);

        // Return user info and token
        res.json({ authtoken, userName, userEmail });
        logger.info('User logged in successfully');
    } catch (e) {
        logger.error(`Error in login: ${e}`);
        return res.status(500).send('Internal server error');
    }
});

router.put('/update', 
  // Validation rules (optional, you can add more if needed)
  body('firstName').optional().isString(),
  body('lastName').optional().isString(),
  body('password').optional().isLength({ min: 6 }),
  async (req, res) => {
    try {
        // Task 2: Validate the input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.error('Validation errors in update request', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        // Task 3: Check if email is present in headers
        const email = req.headers.email;
        if (!email) {
            logger.error('Email not found in the request headers');
            return res.status(400).json({ error: "Email not found in the request headers" });
        }

        // Task 4: Connect to MongoDB and access users collection
        const db = await connectToDatabase();
        const collection = db.collection("users");

        // Task 5: Find the user credentials in database
        const existingUser = await collection.findOne({ email });
        if (!existingUser) {
            logger.error('User not found');
            return res.status(404).json({ error: 'User not found' });
        }

        // Update fields from request body
        if (req.body.firstName) existingUser.firstName = req.body.firstName;
        if (req.body.lastName) existingUser.lastName = req.body.lastName;
        if (req.body.password) {
            const salt = await bcryptjs.genSalt(10);
            existingUser.password = await bcryptjs.hash(req.body.password, salt);
        }
        existingUser.updatedAt = new Date();

        // Task 6: Update the user credentials in the database
        const updatedUser = await collection.findOneAndUpdate(
            { email },
            { $set: existingUser },
            { returnDocument: 'after' }
        );

        // Task 7: Create JWT authentication with user._id as payload
        const payload = {
            user: {
                id: updatedUser.value._id.toString(),
            },
        };
        const authtoken = jwt.sign(payload, JWT_SECRET);

        logger.info('User profile updated successfully');
        res.json({ authtoken });

    } catch (e) {
        logger.error(e);
        return res.status(500).send('Internal server error');
    }
});


module.exports = router;
