import express from 'express';
import { getMusic, createMusic, updateMusic, deleteMusic, getMusicByCategory } from '../controllers/musicController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/adminMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', getMusic); // Public access
router.get('/category/:categoryId', getMusicByCategory); // Public access to get music by category
router.post(
  '/create',
  protect,
  adminOnly,
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: 'File upload error', error: err.message });
      }
      next();
    });
  },
  createMusic
);
router.route('/:id')
  .delete(protect, adminOnly, deleteMusic)
  .put(
    protect,
    adminOnly,
    (req, res, next) => {
      upload(req, res, (err) => {
        if (err) {
          return res.status(400).json({ message: 'File upload error', error: err.message });
        }
        next();
      });
    },
    updateMusic
  );

export default router;