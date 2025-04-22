import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // Ensures email uniqueness check is case-insensitive
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'], // Define allowed roles
      default: 'user', // Default role is 'user'
    },
  },
  {
    timestamps: true,
  }
);

// Match user-entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  
  return await bcrypt.compare(enteredPassword, this.password);
};


// Encrypt password using bcrypt before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next(); // Prevent unnecessary hashing
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

export default User;
