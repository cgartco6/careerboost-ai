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
const cheerio = require('cheerio');

// Initialize Express
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

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

// Enhanced User Schema
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
  locations: [{
    province: String,
    city: String
  }],
  industries: [String],
  skills: [String],
  experienceLevel: String,
  desiredSalary: String,
  
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
  applications: [{
    jobId: String,
    jobTitle: String,
    company: String,
    location: String,
    appliedDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Applied' },
    source: String,
    jobDescription: String
  }],
  totalApplications: { type: Number, default: 0 },
  interviews: { type: Number, default: 0 },
  offers: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLogin: Date,
  emailVerified: { type: Boolean, default: false }
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

// Payment Settings Schema
const paymentSettingsSchema = new mongoose.Schema({
  fnbAccountNumber: { type: String, required: true },
  payfastMerchantId: String,
  payfastMerchantKey: String,
  payfastPassphrase: String,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  updatedAt: { type: Date, default: Date.now }
});

// Job Scraper Schema
const jobScraperSchema = new mongoose.Schema({
  name: String,
  website: String,
  status: { type: String, enum: ['active', 'paused', 'error'], default: 'active' },
  lastRun: Date,
  jobsFound: { type: Number, default: 0 },
  config: Object,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

// Marketing Agent Schema
const marketingAgentSchema = new mongoose.Schema({
  platform: { type: String, enum: ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter'] },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  dailyBudget: Number,
  credentials: Object,
  performance: {
    reach: Number,
    engagements: Number,
    conversions: Number
  },
  lastActive: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);
const PaymentSettings = mongoose.model('PaymentSettings', paymentSettingsSchema);
const JobScraper = mongoose.model('JobScraper', jobScraperSchema);
const MarketingAgent = mongoose.model('MarketingAgent', marketingAgentSchema);

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
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

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

// Customer registration
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Send verification email (would be implemented in production)
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Customer login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        paymentStatus: user.paymentStatus,
        subscriptionEnd: user.subscriptionEnd
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

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

// Get payment settings
app.get('/api/admin/payment-settings', authenticateAdmin, async (req, res) => {
  try {
    let settings = await PaymentSettings.findOne();
    
    if (!settings) {
      // Create default settings
      settings = new PaymentSettings({
        fnbAccountNumber: process.env.FNB_ACCOUNT_NUMBER || '62345678901',
        payfastMerchantId: process.env.PAYFAST_MERCHANT_ID,
        payfastMerchantKey: process.env.PAYFAST_MERCHANT_KEY,
        payfastPassphrase: process.env.PAYFAST_PASSPHRASE
      });
      await settings.save();
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update payment settings
app.put('/api/admin/payment-settings', authenticateAdmin, async (req, res) => {
  try {
    const { fnbAccountNumber, payfastMerchantId, payfastMerchantKey, payfastPassphrase } = req.body;
    
    let settings = await PaymentSettings.findOne();
    
    if (!settings) {
      settings = new PaymentSettings({
        fnbAccountNumber,
        payfastMerchantId,
        payfastMerchantKey,
        payfastPassphrase,
        updatedBy: req.admin._id
      });
    } else {
      settings.fnbAccountNumber = fnbAccountNumber;
      settings.payfastMerchantId = payfastMerchantId;
      settings.payfastMerchantKey = payfastMerchantKey;
      settings.payfastPassphrase = payfastPassphrase;
      settings.updatedBy = req.admin._id;
      settings.updatedAt = new Date();
    }
    
    await settings.save();
    
    res.json({ message: 'Payment settings updated successfully', settings });
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change admin password
app.put('/api/admin/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const admin = await Admin.findById(req.admin._id);
    
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    admin.password = hashedPassword;
    await admin.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Job scraping endpoints
app.get('/api/admin/job-scrapers', authenticateAdmin, async (req, res) => {
  try {
    const scrapers = await JobScraper.find().populate('createdBy', 'username');
    res.json(scrapers);
  } catch (error) {
    console.error('Get job scrapers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/job-scrapers', authenticateAdmin, async (req, res) => {
  try {
    const { name, website, config } = req.body;
    
    const scraper = new JobScraper({
      name,
      website,
      config,
      createdBy: req.admin._id
    });
    
    await scraper.save();
    
    res.json({ message: 'Job scraper created successfully', scraper });
  } catch (error) {
    console.error('Create job scraper error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Marketing agents endpoints
app.get('/api/admin/marketing-agents', authenticateAdmin, async (req, res) => {
  try {
    const agents = await MarketingAgent.find().populate('createdBy', 'username');
    res.json(agents);
  } catch (error) {
    console.error('Get marketing agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/marketing-agents/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status, dailyBudget } = req.body;
    
    const agent = await MarketingAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ message: 'Marketing agent not found' });
    }
    
    agent.status = status;
    agent.dailyBudget = dailyBudget;
    agent.updatedAt = new Date();
    
    await agent.save();
    
    res.json({ message: 'Marketing agent updated successfully', agent });
  } catch (error) {
    console.error('Update marketing agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Payment processing routes
app.post('/api/payment/payfast', authenticateUser, async (req, res) => {
  try {
    const { amount = 499 } = req.body;
    
    const user = await User.findById(req.user._id);
    
    // Get payment settings
    const paymentSettings = await PaymentSettings.findOne();
    
    // Generate PayFast payment data
    const paymentData = {
      merchant_id: paymentSettings.payfastMerchantId,
      merchant_key: paymentSettings.payfastMerchantKey,
      return_url: `${process.env.BASE_URL}/payment-success`,
      cancel_url: `${process.env.BASE_URL}/payment-cancelled`,
      notify_url: `${process.env.BASE_URL}/api/payment/notify`,
      name_first: user.firstName,
      name_last: user.lastName,
      email_address: user.email,
      m_payment_id: user._id.toString(),
      amount: amount.toString(),
      item_name: 'CareerBoost AI Job Application Service',
      item_description: '30-day access to AI-powered job applications',
      custom_str1: user._id.toString()
    };
    
    // In production, generate signature and redirect to PayFast
    // For now, simulate successful payment
    
    user.paymentStatus = 'completed';
    user.paymentMethod = 'payfast';
    user.paymentDate = new Date();
    user.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    user.applicationsRemaining = 999; // Unlimited applications
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Payment processed successfully',
      paymentUrl: process.env.PAYFAST_MODE === 'test' 
        ? 'https://sandbox.payfast.co.za/eng/process'
        : 'https://www.payfast.co.za/eng/process'
    });
  } catch (error) {
    console.error('PayFast payment error:', error);
    res.status(500).json({ message: 'Payment processing failed' });
  }
});

app.post('/api/payment/eft', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Get payment settings for FNB account
    const paymentSettings = await PaymentSettings.findOne();
    
    user.paymentStatus = 'pending';
    user.paymentMethod = 'eft';
    user.paymentReference = `CB${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    await user.save();
    
    res.json({
      success: true,
      reference: user.paymentReference,
      bankDetails: {
        bank: 'First National Bank (FNB)',
        accountName: 'Kelnic (Pty) Ltd',
        accountNumber: paymentSettings.fnbAccountNumber,
        branchCode: '250655',
        reference: user.paymentReference,
        amount: 499
      },
      instructions: 'Please use the reference when making payment. Your account will be activated within 24 hours of payment confirmation.'
    });
  } catch (error) {
    console.error('EFT payment error:', error);
    res.status(500).json({ message: 'EFT payment setup failed' });
  }
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
    
    // Create default marketing agents
    const platforms = ['facebook', 'instagram', 'tiktok', 'youtube', 'twitter'];
    for (const platform of platforms) {
      const agent = new MarketingAgent({
        platform,
        status: 'active',
        dailyBudget: 100,
        createdBy: admin._id
      });
      await agent.save();
    }
    
    res.json({ message: 'Admin user and default settings created successfully' });
  } catch (error) {
    console.error('Admin init error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Job scraping function (simplified example)
async function scrapeJobs(province, city) {
  try {
    // This is a simplified example - real implementation would target specific job sites
    const jobSites = [
      'https://www.careerjet.co.za',
      'https://www.indeed.co.za',
      'https://www.careers24.com'
    ];
    
    const jobs = [];
    
    // Simulate finding jobs
    for (let i = 0; i < 5; i++) {
      jobs.push({
        title: `Sample Job ${i+1} in ${city}`,
        company: `Company ${i+1}`,
        location: `${city}, ${province}`,
        description: `This is a sample job description for a position in ${city}, ${province}.`,
        salary: 'R20,000 - R30,000',
        url: `https://example.com/job/${i+1}`,
        postedDate: new Date()
      });
    }
    
    return jobs;
  } catch (error) {
    console.error('Job scraping error:', error);
    return [];
  }
}

// AI Resume processing function (placeholder)
async function processResume(resumeText) {
  // This would integrate with OpenAI API in production
  return {
    optimizedText: resumeText + " [AI Optimized Version]",
    skills: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
    experience: '5 years',
    summary: 'Experienced professional with strong technical skills'
  };
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Admin initialization endpoint: http://localhost:${PORT}/api/admin/init`);
});
