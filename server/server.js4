require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const axios = require('axios');

// Initialize Express
const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.co.za'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/careerboost', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, default: 'admin' },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now }
});

// Enhanced User Schema
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
  paymentAmount: { type: Number, default: 499 },
  subscriptionEnd: Date,
  applications: [{
    jobId: String,
    jobTitle: String,
    company: String,
    location: String,
    appliedDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Applied' }
  }],
  totalApplications: { type: Number, default: 0 },
  interviews: { type: Number, default: 0 },
  offers: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Marketing Content Schema
const marketingContentSchema = new mongoose.Schema({
  title: String,
  type: { type: String, enum: ['short', 'graphic', 'content', 'voice'] },
  description: String,
  status: { type: String, default: 'draft' },
  generatedContent: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);
const User = mongoose.model('User', userSchema);
const MarketingContent = mongoose.model('MarketingContent', marketingContentSchema);

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
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

// Routes

// Admin authentication
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard statistics
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const paidUsers = await User.countDocuments({ paymentStatus: 'completed' });
    const totalRevenue = await User.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$paymentAmount' } } }
    ]);
    
    const totalApplications = await User.aggregate([
      { $unwind: '$applications' },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    
    const applicationsByStatus = await User.aggregate([
      { $unwind: '$applications' },
      { $group: { _id: '$applications.status', count: { $sum: 1 } } }
    ]);
    
    const revenueByMonth = await User.aggregate([
      { $match: { paymentStatus: 'completed' } },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          revenue: { $sum: '$paymentAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    const userRegistrations = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      totalUsers,
      paidUsers,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      totalApplications: totalApplications.length > 0 ? totalApplications[0].count : 0,
      applicationsByStatus,
      revenueByMonth,
      userRegistrations
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Marketing content generation
app.post('/api/admin/marketing/generate', authenticateAdmin, async (req, res) => {
  try {
    const { type, title, description } = req.body;
    
    // In a real implementation, this would integrate with AI services
    // like OpenAI for content generation
    
    let generatedContent = '';
    
    switch (type) {
      case 'short':
        generatedContent = await generateShortVideoScript(title, description);
        break;
      case 'graphic':
        generatedContent = await generateGraphicDesign(title, description);
        break;
      case 'content':
        generatedContent = await generateContentIdea(title, description);
        break;
      case 'voice':
        generatedContent = await generateVoiceOverScript(title, description);
        break;
    }
    
    const marketingContent = new MarketingContent({
      title,
      type,
      description,
      generatedContent,
      createdBy: req.admin._id
    });
    
    await marketingContent.save();
    
    res.json({
      success: true,
      content: marketingContent
    });
  } catch (error) {
    console.error('Marketing content generation error:', error);
    res.status(500).json({ message: 'Content generation failed' });
  }
});

// Get marketing content
app.get('/api/admin/marketing/content', authenticateAdmin, async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    
    const query = type ? { type } : {};
    
    const content = await MarketingContent.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'username');
    
    const total = await MarketingContent.countDocuments(query);
    
    res.json({
      content,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get marketing content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Payment processing routes (from previous implementation)
app.post('/api/payment/payfast', async (req, res) => {
  // PayFast payment processing logic
});

app.post('/api/payment/eft', async (req, res) => {
  // EFT payment processing logic
});

// User registration and authentication routes
app.post('/api/register', async (req, res) => {
  // User registration logic
});

app.post('/api/login', async (req, res) => {
  // User login logic
});

// Initialize admin user (run once)
app.post('/api/admin/init', async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin user already exists' });
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = new Admin({
      username: 'admin',
      password: hashedPassword,
      email: 'info@kelnic.co.za',
      role: 'superadmin'
    });
    
    await admin.save();
    
    res.json({ message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Admin init error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// AI Content Generation Functions (Placeholders)
async function generateShortVideoScript(title, description) {
  // Integration with OpenAI API would go here
  return `Short video script for: ${title}\n\nDescription: ${description}\n\n[AI-generated script content would appear here]`;
}

async function generateGraphicDesign(title, description) {
  // Integration with DALL-E or similar would go here
  return `Graphic design specifications for: ${title}\n\nDescription: ${description}\n\n[AI-generated design specifications would appear here]`;
}

async function generateContentIdea(title, description) {
  // Integration with OpenAI API would go here
  return `Content ideas for: ${title}\n\nDescription: ${description}\n\n[AI-generated content ideas would appear here]`;
}

async function generateVoiceOverScript(title, description) {
  // Integration with text-to-speech services would go here
  return `Voice-over script for: ${title}\n\nDescription: ${description}\n\n[AI-generated voice-over script would appear here]`;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin initialization endpoint: http://localhost:${PORT}/api/admin/init`);
});
