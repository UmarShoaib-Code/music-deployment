// controllers/musicController.js
import Music from "../models/Music.js";
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// @desc    Get music by category
// @route   GET /api/music/category/:categoryId
// @access  Public
const getMusicByCategory = asyncHandler(async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: 'Invalid category ID' });
    }

    console.log(`Fetching music for category: ${categoryId}`);
    const musicList = await Music.find({ category: categoryId }).populate({
      path: 'category',
      select: 'name description types',
    });

    if (!musicList.length) {
      return res.status(404).json({ message: 'No music found for this category' });
    }

    const musicWithUrls = musicList.map(music => {
      const baseUrl = `${process.env.BASE_URL}/uploads/`;
      const fileName = music.fileUrl ? path.basename(music.fileUrl) : null;
      const thumbnailName = music.thumbnailUrl ? path.basename(music.thumbnailUrl) : null;

      let categoryTypeDetails = null;
      if (music.category && music.categoryType && music.category.types) {
        categoryTypeDetails = music.category.types.find(type => 
          type._id.toString() === music.categoryType.toString()
        );
      }

      return {
        ...music._doc,
        fileUrl: fileName ? `${baseUrl}${fileName}` : null,
        thumbnailUrl: thumbnailName ? `${baseUrl}${thumbnailName}` : null,
        category: music.category ? {
          _id: music.category._id,
          name: music.category.name,
          description: music.category.description,
        } : null,
        categoryType: categoryTypeDetails || null,
      };
    });

    console.log('Music with URLs by category:', musicWithUrls);
    res.json(musicWithUrls);
  } catch (error) {
    console.error('Error in getMusicByCategory:', error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});
// @desc    Get all music with category and type details
// @route   GET /api/music
// @access  Public
// controllers/musicController.js
const getMusic = asyncHandler(async (req, res) => {
  try {
    console.log('Fetching music from database...');
    const musicList = await Music.find().populate({
      path: 'category',
      select: 'name description types',
    });

    const musicWithUrls = musicList.map(music => {
      const baseUrl = `${process.env.BASE_URL}/uploads/`;
      const fileName = music.fileUrl ? path.basename(music.fileUrl) : null;
      const thumbnailName = music.thumbnailUrl ? path.basename(music.thumbnailUrl) : null;

      // Safely handle categoryType lookup
      let categoryTypeDetails = null;
      if (music.category && music.categoryType && music.category.types) {
        categoryTypeDetails = music.category.types.find(type => 
          type._id.toString() === music.categoryType.toString()
        );
      }

      return {
        ...music._doc,
        fileUrl: fileName ? `${baseUrl}${fileName}` : null,
        thumbnailUrl: thumbnailName ? `${baseUrl}${thumbnailName}` : null,
        category: music.category ? {
          _id: music.category._id,
          name: music.category.name,
          description: music.category.description,
        } : null, // Handle null category
        categoryType: categoryTypeDetails,
      };
    });

    console.log('Music with URLs:', musicWithUrls);
    res.json(musicWithUrls);
  } catch (error) {
    console.error('Error in getMusic:', error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// @desc    Create new music with file and thumbnail upload
// @route   POST /api/music/create
// @access  Private/Admin
const createMusic = asyncHandler(async (req, res) => {
  console.log('Request Body:', req.body);
  console.log('Files:', req.files);
  const { title, artist, category, categoryType, duration, releaseDate } = req.body;
  const audioFile = req.files?.file?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  // Validate required fields
  const missingFields = [];
  if (!title) missingFields.push('title');
  if (!artist) missingFields.push('artist');
  if (!category) missingFields.push('category');
  if (!categoryType) missingFields.push('categoryType'); // Add this
  if (!audioFile) missingFields.push('file');
  if (!duration) missingFields.push('duration');
  if (!releaseDate) missingFields.push('releaseDate');

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: "Missing required fields",
      missing: missingFields
    });
  }

  try {
    const musicData = {
      title,
      artist,
      category: new mongoose.Types.ObjectId(category),
      categoryType: new mongoose.Types.ObjectId(categoryType), // Always set since validated
      fileUrl: `/uploads/${audioFile.filename}`,
      duration: Number(duration),
      releaseDate: new Date(releaseDate),
      user: req.user._id,
    };

    if (thumbnailFile) {
      musicData.thumbnailUrl = `/uploads/${thumbnailFile.filename}`;
    }

    console.log('Creating music with data:', musicData); // Log before creation
    const music = await Music.create(musicData);
    const populatedMusic = await Music.findById(music._id).populate('category', 'name description');
    res.status(201).json(populatedMusic);
  } catch (error) {
    console.error('Create music error:', error);
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
});

// @desc    Update music
// @route   PUT /api/music/:id
// @access  Private/Admin
const updateMusic = asyncHandler(async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);
    
    if (!music) {
      return res.status(404).json({ message: 'Music not found' });
    }

    // Handle file updates
    const audioFile = req.files?.file?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    // Update fields
    music.title = req.body.title || music.title;
    music.artist = req.body.artist || music.artist;
    music.category = req.body.category ? new mongoose.Types.ObjectId(req.body.category) : music.category;
    music.categoryType = req.body.categoryType ? new mongoose.Types.ObjectId(req.body.categoryType) : music.categoryType;
    music.duration = req.body.duration || music.duration;
    music.releaseDate = req.body.releaseDate || music.releaseDate;

    if (audioFile) {
      if (music.fileUrl) {
        const oldFilePath = path.join(__dirname, '../uploads', path.basename(music.fileUrl));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      music.fileUrl = `/uploads/${audioFile.filename}`;
    }

    if (thumbnailFile) {
      if (music.thumbnailUrl) {
        const oldThumbPath = path.join(__dirname, '../uploads', path.basename(music.thumbnailUrl));
        if (fs.existsSync(oldThumbPath)) {
          fs.unlinkSync(oldThumbPath);
        }
      }
      music.thumbnailUrl = `/uploads/${thumbnailFile.filename}`;
    }

    const updatedMusic = await music.save();
    const populatedMusic = await Music.findById(updatedMusic._id).populate('category', 'name description');
    res.json(populatedMusic);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      message: 'Server Error',
      error: error.message 
    });
  }
});

// @desc    Delete music
// @route   DELETE /api/music/:id
// @access  Private/Admin
const deleteMusic = asyncHandler(async (req, res) => {
  const music = await Music.findById(req.params.id);
  if (!music) {
    res.status(404);
    throw new Error('Music not found');
  }
  
  // Clean up files
  if (music.fileUrl) {
    const filePath = path.join(__dirname, '../uploads', path.basename(music.fileUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  if (music.thumbnailUrl) {
    const thumbPath = path.join(__dirname, '../uploads', path.basename(music.thumbnailUrl));
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  }

  await Music.findByIdAndDelete(req.params.id);
  res.json({ message: 'Music deleted successfully' });
});

export { getMusic, getMusicByCategory, createMusic, updateMusic, deleteMusic };