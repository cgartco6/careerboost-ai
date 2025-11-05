const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');

// Generate PayFast payment signature
function generateSignature(data, passphrase = '') {
  const pfOutput = Object.keys(data)
    .filter(key => data[key] !== '')
    .sort()
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');
  
  return crypto.createHash('md5').update(pfOutput + (passphrase ? `&passphrase=${passphrase}` : '')).digest('hex');
}

// Initiate PayFast payment
router.post('/payfast', async (req, res) => {
  try {
    const { userId, amount = 499, returnUrl, cancelUrl, notifyUrl } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const paymentData = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: returnUrl || `${process.env.BASE_URL}/payment-success`,
      cancel_url: cancelUrl || `${process.env.BASE_URL}/payment-cancelled`,
      notify_url: notifyUrl || `${process.env.BASE_URL}/api/payment/notify`,
      name_first: user.firstName,
      name_last: user.lastName,
      email_address: user.email,
      m_payment_id: userId,
      amount: amount.toString(),
      item_name: 'CareerBoost AI Job Application Service',
      item_description: '30-day access to AI-powered job applications',
      custom_str1: userId
    };

    // Generate signature
    paymentData.signature = generateSignature(paymentData, process.env.PAYFAST_PASSPHRASE);

    res.json({
      paymentUrl: process.env.PAYFAST_MODE === 'test' 
        ? 'https://sandbox.payfast.co.za/eng/process'
        : 'https://www.payfast.co.za/eng/process',
      data: paymentData
    });
  } catch (error) {
    console.error('PayFast initiation error:', error);
    res.status(500).json({ message: 'Payment initiation failed' });
  }
});

// PayFast ITN (Instant Transaction Notification) handler
router.post('/notify', async (req, res) => {
  try {
    const data = req.body;
    
    // Verify signature
    const signature = generateSignature(data, process.env.PAYFAST_PASSPHRASE);
    if (signature !== data.signature) {
      return res.status(400).send('Invalid signature');
    }

    const userId = data.m_payment_id || data.custom_str1;
    const paymentStatus = data.payment_status;

    const user = await User.findById(userId);
    if (user) {
      if (paymentStatus === 'COMPLETE') {
        user.paymentStatus = 'completed';
        user.paymentDate = new Date();
        user.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        user.applicationsRemaining = 999; // Unlimited applications
        
        // Send confirmation email
        await sendPaymentConfirmationEmail(user.email, user.firstName);
      } else {
        user.paymentStatus = 'failed';
      }
      await user.save();
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Payment notification error:', error);
    res.status(500).send('Error processing payment');
  }
});

// Direct EFT payment handler
router.post('/eft', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate EFT payment reference
    const paymentReference = `CB${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    user.paymentStatus = 'pending';
    user.paymentMethod = 'eft';
    user.paymentReference = paymentReference;
    await user.save();

    res.json({
      success: true,
      reference: paymentReference,
      bankDetails: {
        bank: 'Standard Bank',
        accountName: 'CareerBoost AI (Pty) Ltd',
        accountNumber: '0123456789',
        branchCode: '051001',
        reference: paymentReference,
        amount: 499
      },
      instructions: 'Please use the reference when making payment. Your account will be activated within 24 hours of payment confirmation.'
    });
  } catch (error) {
    console.error('EFT payment error:', error);
    res.status(500).json({ message: 'EFT payment setup failed' });
  }
});

async function sendPaymentConfirmationEmail(email, firstName) {
  // Implement email sending using Afrihost SMTP
  // This would use nodemailer with your Afrihost email credentials
}

module.exports = router;
