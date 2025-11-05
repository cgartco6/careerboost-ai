const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/careerboost', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    phone: String,
    createdAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        productId: String,
        name: String,
        price: Number,
        quantity: Number
    }],
    total: Number,
    paymentMethod: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Order = mongoose.model('Order', orderSchema);

// AI Service Integration
class AIService {
    static async processResume(resumeText) {
        // Integrate with OpenAI API
        return {
            optimized: resumeText + " [AI Optimized]",
            skills: ['AI', 'Machine Learning', 'Data Analysis'],
            score: 85
        };
    }

    static async findJobs(userProfile, locations) {
        // Integrate with job search APIs
        return [
            {
                title: 'Software Developer',
                company: 'Tech Corp',
                location: 'Cape Town',
                match: 92
            }
        ];
    }
}

// Routes

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, name, phone } = req.body;
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            email,
            password: hashedPassword,
            name,
            phone
        });

        await user.save();

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

        res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

        res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create Order
app.post('/api/orders', async (req, res) => {
    try {
        const { items, total, paymentMethod, userId } = req.body;

        const order = new Order({
            userId,
            items,
            total,
            paymentMethod
        });

        await order.save();

        // Process payment based on method
        if (paymentMethod === 'payfast') {
            // Integrate with PayFast API
            const paymentUrl = await processPayFastPayment(order);
            res.json({ paymentUrl, orderId: order._id });
        } else {
            // EFT payment
            res.json({ 
                message: 'Payment pending', 
                orderId: order._id,
                bankDetails: {
                    bank: 'FNB',
                    account: 'Kelnic Solutions',
                    accountNumber: process.env.FNB_ACCOUNT,
                    reference: `CB${order._id}`
                }
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// AI Resume Processing
app.post('/api/ai/process-resume', async (req, res) => {
    try {
        const { resumeText } = req.body;
        const result = await AIService.processResume(resumeText);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'AI processing failed' });
    }
});

// Job Search
app.post('/api/ai/find-jobs', async (req, res) => {
    try {
        const { userProfile, locations } = req.body;
        const jobs = await AIService.findJobs(userProfile, locations);
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: 'Job search failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
