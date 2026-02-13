const express = require('express');
const db = require('../database');

const router = express.Router();

// Get all customers with credits
router.get('/', async (req, res) => {
  try {
    const { search, hasCredit } = req.query;
    let query = {};
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }
    let customers = await db.customers.find(query);
    
    // Add credit info
    for (let customer of customers) {
      const credits = await db.credits.find({ customerId: customer._id, status: { $ne: 'paid' } });
      customer.totalCredit = credits.reduce((sum, c) => sum + (c.amount - c.paidAmount), 0);
    }
    
    if (hasCredit === 'true') {
      customers = customers.filter(c => c.totalCredit > 0);
    }
    
    customers.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get single customer with statement
router.get('/:id', async (req, res) => {
  try {
    const customer = await db.customers.findOne({ _id: req.params.id });
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    
    const sales = await db.sales.find({ customerId: customer._id });
    const credits = await db.credits.find({ customerId: customer._id });
    const payments = await db.payments.find({ customerId: customer._id });
    
    customer.totalCredit = credits.filter(c => c.status !== 'paid').reduce((sum, c) => sum + (c.amount - c.paidAmount), 0);
    customer.sales = sales;
    customer.credits = credits;
    customer.payments = payments;
    
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, address, notes, category, creditLimit } = req.body;
    
    const customer = await db.customers.insert({
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      notes: notes || '',
      category: category || 'regular', // regular, vip, wholesale
      creditLimit: parseFloat(creditLimit) || 0,
      totalPurchases: 0,
      loyaltyPoints: 0,
      lastPurchase: null,
      createdAt: new Date(),
    });
    
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, email, address, notes, category, creditLimit } = req.body;
    
    await db.customers.update(
      { _id: req.params.id },
      { $set: { name, phone, email, address, notes, category, creditLimit: parseFloat(creditLimit) || 0, updatedAt: new Date() } }
    );
    
    const updated = await db.customers.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    await db.customers.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get customer statement (كشف حساب)
router.get('/:id/statement', async (req, res) => {
  try {
    const customer = await db.customers.findOne({ _id: req.params.id });
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    
    const credits = await db.credits.find({ customerId: req.params.id });
    const payments = await db.payments.find({ customerId: req.params.id });
    
    // Build statement
    const statement = [];
    
    for (const credit of credits) {
      statement.push({
        type: 'credit',
        date: credit.createdAt,
        description: `فاتورة ${credit.invoiceNumber}`,
        debit: credit.amount,
        credit: 0,
        balance: 0,
      });
    }
    
    for (const payment of payments) {
      statement.push({
        type: 'payment',
        date: payment.createdAt,
        description: payment.notes || 'سداد',
        debit: 0,
        credit: payment.amount,
        balance: 0,
      });
    }
    
    // Sort by date
    statement.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate running balance
    let balance = 0;
    for (const item of statement) {
      balance += item.debit - item.credit;
      item.balance = balance;
    }
    
    res.json({
      customer,
      statement,
      totalDebit: statement.reduce((sum, s) => sum + s.debit, 0),
      totalCredit: statement.reduce((sum, s) => sum + s.credit, 0),
      finalBalance: balance,
    });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Record payment from customer
router.post('/:id/payment', async (req, res) => {
  try {
    const { amount, method, notes, creditId } = req.body;
    const customer = await db.customers.findOne({ _id: req.params.id });
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    
    // Record payment
    const payment = await db.payments.insert({
      customerId: req.params.id,
      customerName: customer.name,
      amount: parseFloat(amount),
      method: method || 'cash',
      notes: notes || '',
      creditId: creditId || null,
      createdAt: new Date(),
    });
    
    // Update credit if specified
    if (creditId) {
      const credit = await db.credits.findOne({ _id: creditId });
      if (credit) {
        const newPaidAmount = (credit.paidAmount || 0) + parseFloat(amount);
        await db.credits.update(
          { _id: creditId },
          { $set: { paidAmount: newPaidAmount, status: newPaidAmount >= credit.amount ? 'paid' : 'partial' } }
        );
      }
    } else {
      // Apply to oldest credits
      const credits = await db.credits.find({ customerId: req.params.id, status: { $ne: 'paid' } });
      credits.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      let remaining = parseFloat(amount);
      for (const credit of credits) {
        if (remaining <= 0) break;
        const owed = credit.amount - (credit.paidAmount || 0);
        const apply = Math.min(remaining, owed);
        const newPaidAmount = (credit.paidAmount || 0) + apply;
        await db.credits.update(
          { _id: credit._id },
          { $set: { paidAmount: newPaidAmount, status: newPaidAmount >= credit.amount ? 'paid' : 'partial' } }
        );
        remaining -= apply;
      }
    }
    
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Send SMS (Stub)
router.post('/:id/sms', async (req, res) => {
  try {
    const { message } = req.body;
    const customer = await db.customers.findOne({ _id: req.params.id });
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    
    // In a real app, integrate with Twilio or local SMS gateway here
    console.log(`[SMS] To: ${customer.phone}, Message: ${message}`);
    
    await db.customers.update(
      { _id: req.params.id },
      { $set: { lastSmsSent: new Date() } }
    );
    
    res.json({ success: true, message: 'تم إرسال الرسالة بنجاح (محاكاة)' });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Loyalty points
router.post('/:id/redeem-points', async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await db.customers.findOne({ _id: req.params.id });
    if (!customer) return res.status(404).json({ error: 'العميل غير موجود' });
    if ((customer.loyaltyPoints || 0) < points) return res.status(400).json({ error: 'نقاط غير كافية' });
    
    const settings = await db.settings.findOne({ key: 'store' });
    const pointValue = settings?.loyaltyPointValue || 0.1;
    const discountValue = points * pointValue;
    
    await db.customers.update(
      { _id: req.params.id },
      { 
          $set: { loyaltyPoints: customer.loyaltyPoints - points },
          $inc: { redeemedPoints: points }
      }
    );
    
    res.json({ success: true, discountValue, remainingPoints: customer.loyaltyPoints - points });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get credits (ذمم مدينة)
router.get('/credits/all', async (req, res) => {
  try {
    const credits = await db.credits.find({ status: { $ne: 'paid' } });
    const total = credits.reduce((sum, c) => sum + (c.amount - (c.paidAmount || 0)), 0);
    credits.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ credits, total });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
