import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';


// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
// backend/controllers/userController.js
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Debugging log: Check the incoming email and password
  console.log('Auth attempt:', { email, password });

  const user = await User.findOne({ email: email.toLowerCase() });

  // Debugging log: Check if the user was found and their stored password
  console.log('User found:', user ? { email: user.email, role: user.role } : 'No user');
  console.log('Password from DB:', user ? user.password : 'No user password');

  if (!user) {
    res.status(401);
    throw new Error('User not found');
  }

  // Compare entered password with the password in the DB
  const passwordMatch = await user.matchPassword(password);

  // Debugging log: Check if the password comparison succeeded
  console.log('Entered Password:', password);
  console.log('Password match:', passwordMatch);  // This will show true/false

  if (passwordMatch) {
    const token = generateToken(user._id);
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } else {
    res.status(401);
    throw new Error('Invalid password');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  try {
    const { name, email, password, role } = req.body; // Accept role from request

    // Check if the user already exists
    let userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const user = await User.create({
      name,
      email,
      password, 
      role: role || 'user', // Assign role or default to 'user'
    });

    if (user) {
      const token = generateToken(user._id);

    // ✅ Set the token as an HTTP-only cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set true in production (HTTPS)
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // Include role in response
        token,
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // Include role in response
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Forgot password
// @route   PUT /api/users/forgot-password
// @access  Private




// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    if (req.body.role && req.user.role === 'admin') {
      // Allow role update only if the user is an admin
      user.role = req.body.role;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role, // Include updated role in response
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});


// @desc    Get all users (Admin only)
// @route   GET /api/users/all
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

// @desc    Get specific user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Forgot password
// @route   POST /api/users/forgot-password
// @access  Public
const forgotUserPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: "support@gmail.com",
    to: user.email,
    subject: 'Password Reset Request',
    text: `Click here to reset your password: ${resetUrl}`,
  };

  await transporter.sendMail(mailOptions);
  res.json({ message: 'Password reset email sent successfully.' });
});

// @desc    Reset password
// @route   POST /api/users/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) {
    res.status(400);
    throw new Error('Invalid token or user does not exist');
  }

  user.password = password; // Password will be hashed by pre-save hook
  await user.save();

  res.json({ message: 'Password reset successful' });
});
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  if (user.role === 'admin') {
    res.status(403);
    throw new Error('Cannot delete an admin');
  }
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted successfully' });
});


export {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  forgotUserPassword,
  resetPassword,
  getAllUsers,
  getUserById,
  deleteUser,
};