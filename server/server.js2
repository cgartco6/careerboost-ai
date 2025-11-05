const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/careerboost', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  phone: String,
  resumeFile: String,
  locations: [String],
  paymentStatus: { type: String, default: 'pending' },
  paymentMethod: String,
  paymentDate: Date,
  applications: [{
    jobId: String,
    jobTitle: String,
    company: String,
    location: String,
    appliedDate: Date,
    status: String
  }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /pdf|doc|docx|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Error: Only PDF, DOC, DOCX, and TXT files are allowed!');
    }
  }
});

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
    
    res.status(201).json({ result: user, token });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '1h' }
    );
    
    res.status(200).json({ result: user, token });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' });
  }
});

app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    const userId = req.body.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.resumeFile = req.file.filename;
    await user.save();
    
    res.status(200).json({ message: 'Resume uploaded successfully', filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.post('/api/update-locations', async (req, res) => {
  try {
    const { userId, locations } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.locations = locations;
    await user.save();
    
    res.status(200).json({ message: 'Locations updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Update failed' });
  }
});

app.post('/api/process-payment', async (req, res) => {
  try {
    const { userId, paymentMethod } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.paymentStatus = 'completed';
    user.paymentMethod = paymentMethod;
    user.paymentDate = new Date();
    
    await user.save();
    
    // Here you would integrate with PayFast API
    // For demonstration, we'll just return success
    
    res.status(200).json({ 
      message: 'Payment processed successfully',
      redirectUrl: paymentMethod === 'payfast' ? 'https://www.payfast.co.za/eng/process...' : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment processing failed' });
  }
});

// AI Resume Processing (Integration with OpenAI API)
app.post('/api/process-resume', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // This would integrate with OpenAI API to rewrite the resume
    // For now, we'll return a placeholder response
    
    const processedResume = {
      original: user.resumeFile,
      optimized: `optimized-${user.resumeFile}`,
      skills: ['JavaScript', 'Node.js', 'React', 'MongoDB'], // Extracted skills
      experience: '5 years' // Extracted experience
    };
    
    res.status(200).json({ message: 'Resume processed successfully', resume: processedResume });
  } catch (error) {
    res.status(500).json({ message: 'Resume processing failed' });
  }
});

// Job Search Integration
app.post('/api/search-jobs', async (req, res) => {
  try {
    const { locations, skills } = req.body;
    
    // This would integrate with job search APIs or web scraping
    // For now, we'll return sample job data
    
    const jobs = [
      {
        id: '1',
        title: 'Software Developer',
        company: 'Tech Solutions SA',
        location: 'Cape Town',
        description: 'Looking for an experienced software developer...',
        salary: 'R40,000 - R60,000',
        postedDate: new Date(),
        applyUrl: 'https://example.com/apply/1'
      },
      // More job objects...
    ];
    
    res.status(200).json({ jobs });
  } catch (error) {
    res.status(500).json({ message: 'Job search failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
