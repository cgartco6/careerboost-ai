const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: String,
  jobTitle: String,
  company: String,
  location: String,
  appliedDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Applied' }, // Applied, Interview, Rejected, Offer
  coverLetter: String,
  resumeUsed: String
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  phone: String,
  resumeFile: String,
  optimizedResume: String,
  locations: [String],
  industries: [String],
  skills: [String],
  experienceLevel: String,
  paymentStatus: { type: String, default: 'pending' },
  paymentMethod: String,
  paymentDate: Date,
  subscriptionEnd: Date,
  applications: [applicationSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
