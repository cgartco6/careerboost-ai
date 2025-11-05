const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const applicationSchema = new mongoose.Schema({
  jobId: { type: String, required: true },
  jobTitle: String,
  company: String,
  location: String,
  appliedDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Applied' },
  coverLetter: String,
  resumeUsed: String,
  jobDescription: String,
  salaryRange: String,
  applicationUrl: String
});

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  firstName: { 
    type: String, 
    required: true,
    trim: true
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  resumeFile: String,
  optimizedResume: String,
  originalResumeText: String,
  optimizedResumeText: String,
  locations: [String],
  industries: [String],
  skills: [String],
  experienceLevel: String,
  desiredSalary: String,
  jobPreferences: {
    type: Map,
    of: String
  },
  
  // Payment & Subscription
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  paymentMethod: String,
  paymentDate: Date,
  paymentAmount: { type: Number, default: 499 },
  subscriptionEnd: Date,
  applicationsRemaining: { type: Number, default: 0 },
  
  // Application tracking
  applications: [applicationSchema],
  totalApplications: { type: Number, default: 0 },
  interviews: { type: Number, default: 0 },
  offers: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLogin: Date
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
