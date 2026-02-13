const express = require('express');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all products with variants
router.get('/', async (req, res) => {
  try {
    const { category, search, lowStock, expiringSoon } = req.query;
    let query = {};

    if (category) query.categoryId = category;
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { sku: new RegExp(search, 'i') },
      ];
    }

    let products = await db.products.find(query);

    // Filter low stock
    if (lowStock === 'true') {
      products = products.filter(p => p.quantity <= (p.minStock || 5));
    }

    // Filter expiring soon
    if (expiringSoon === 'true') {
      const alertDays = 30;
      const alertDate = new Date();
      alertDate.setDate(alertDate.getDate() + alertDays);
      products = products.filter(p => p.expiryDate && new Date(p.expiryDate) <= alertDate);
    }

    // Get variants for each product
    for (let product of products) {
      if (product.hasVariants) {
        product.variants = await db.variants.find({ productId: product._id });
      }
    }

    products.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'حدث خطأ في جلب المنتجات' });
  }
});

// Get single product with variants
router.get('/:id', async (req, res) => {
  try {
    const product = await db.products.findOne({ _id: req.params.id });
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    
    if (product.hasVariants) {
      product.variants = await db.variants.find({ productId: product._id });
    }
    if (product.isBundle) {
      product.bundleItems = await db.bundles.find({ bundleId: product._id });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get by barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    // Check product barcode
    let product = await db.products.findOne({ barcode: req.params.barcode });
    
    // Check variant barcode
    if (!product) {
      const variant = await db.variants.findOne({ barcode: req.params.barcode });
      if (variant) {
        product = await db.products.findOne({ _id: variant.productId });
        if (product) product.selectedVariant = variant;
      }
    }
    
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Generate barcode
router.get('/generate/barcode', async (req, res) => {
  try {
    const barcode = '2' + Date.now().toString().slice(-12);
    res.json({ barcode });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const {
      name, barcode, sku, categoryId, supplierId,
      price, cost, quantity, minStock, unit,
      description, image, taxRate,
      expiryDate, hasVariants, isBundle,
      variants, bundleItems,
      wholesalePrice, wholesaleMinQty
    } = req.body;

    // Check barcode
    if (barcode) {
      const exists = await db.products.findOne({ barcode });
      if (exists) return res.status(400).json({ error: 'الباركود موجود بالفعل' });
    }

    const product = await db.products.insert({
      name,
      barcode: barcode || '2' + Date.now().toString().slice(-12),
      sku: sku || '',
      categoryId: categoryId || null,
      supplierId: supplierId || null,
      price: parseFloat(price) || 0,
      cost: parseFloat(cost) || 0,
      quantity: parseInt(quantity) || 0,
      minStock: parseInt(minStock) || 5,
      unit: unit || 'قطعة',
      description: description || '',
      image: image || null,
      taxRate: parseFloat(taxRate) || 0,
      expiryDate: expiryDate || null,
      hasVariants: hasVariants || false,
      isBundle: isBundle || false,
      wholesalePrice: parseFloat(wholesalePrice) || 0,
      wholesaleMinQty: parseInt(wholesaleMinQty) || 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add variants
    if (hasVariants && variants?.length) {
      for (const v of variants) {
        await db.variants.insert({
          productId: product._id,
          name: v.name,
          value: v.value,
          barcode: v.barcode || '',
          price: parseFloat(v.price) || product.price,
          cost: parseFloat(v.cost) || product.cost,
          quantity: parseInt(v.quantity) || 0,
          sku: v.sku || '',
          createdAt: new Date(),
        });
      }
    }

    // Add bundle items
    if (isBundle && bundleItems?.length) {
      for (const item of bundleItems) {
        await db.bundles.insert({
          bundleId: product._id,
          productId: item.productId,
          quantity: parseInt(item.quantity) || 1,
          createdAt: new Date(),
        });
      }
    }

    res.json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'حدث خطأ في إضافة المنتج' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const {
      name, barcode, sku, categoryId, supplierId,
      price, cost, quantity, minStock, unit,
      description, image, taxRate,
      expiryDate, hasVariants, isBundle,
      variants, bundleItems,
      wholesalePrice, wholesaleMinQty
    } = req.body;

    // Check barcode
    if (barcode) {
      const exists = await db.products.findOne({ barcode, _id: { $ne: req.params.id } });
      if (exists) return res.status(400).json({ error: 'الباركود موجود بالفعل' });
    }

    await db.products.update(
      { _id: req.params.id },
      {
        $set: {
          name, barcode, sku, categoryId, supplierId,
          price: parseFloat(price) || 0,
          cost: parseFloat(cost) || 0,
          quantity: parseInt(quantity) || 0,
          minStock: parseInt(minStock) || 5,
          unit, description, image,
          taxRate: parseFloat(taxRate) || 0,
          expiryDate, hasVariants, isBundle,
          wholesalePrice: parseFloat(wholesalePrice) || 0,
          wholesaleMinQty: parseInt(wholesaleMinQty) || 10,
          updatedAt: new Date(),
        },
      }
    );

    // Update variants
    if (hasVariants) {
      await db.variants.remove({ productId: req.params.id }, { multi: true });
      if (variants?.length) {
        for (const v of variants) {
          await db.variants.insert({
            productId: req.params.id,
            name: v.name,
            value: v.value,
            barcode: v.barcode || '',
            price: parseFloat(v.price) || 0,
            cost: parseFloat(v.cost) || 0,
            quantity: parseInt(v.quantity) || 0,
            sku: v.sku || '',
            createdAt: new Date(),
          });
        }
      }
    }

    // Update bundle
    if (isBundle) {
      await db.bundles.remove({ bundleId: req.params.id }, { multi: true });
      if (bundleItems?.length) {
        for (const item of bundleItems) {
          await db.bundles.insert({
            bundleId: req.params.id,
            productId: item.productId,
            quantity: parseInt(item.quantity) || 1,
            createdAt: new Date(),
          });
        }
      }
    }

    const updated = await db.products.findOne({ _id: req.params.id });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في تحديث المنتج' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    await db.variants.remove({ productId: req.params.id }, { multi: true });
    await db.bundles.remove({ bundleId: req.params.id }, { multi: true });
    await db.products.remove({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في حذف المنتج' });
  }
});

// Update stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { quantity, operation, variantId, reason } = req.body;
    
    if (variantId) {
      const variant = await db.variants.findOne({ _id: variantId });
      if (!variant) return res.status(404).json({ error: 'المتغير غير موجود' });
      
      let newQty = variant.quantity;
      if (operation === 'add') newQty += parseInt(quantity);
      else if (operation === 'subtract') newQty -= parseInt(quantity);
      else newQty = parseInt(quantity);
      
      await db.variants.update({ _id: variantId }, { $set: { quantity: Math.max(0, newQty) } });
      
      await db.inventory.insert({
        productId: variant.productId,
        variantId,
        previousQuantity: variant.quantity,
        newQuantity: Math.max(0, newQty),
        change: newQty - variant.quantity,
        operation,
        reason: reason || '',
        createdAt: new Date(),
      });
      
      return res.json({ success: true, newQuantity: Math.max(0, newQty) });
    }
    
    const product = await db.products.findOne({ _id: req.params.id });
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    let newQty = product.quantity;
    if (operation === 'add') newQty += parseInt(quantity);
    else if (operation === 'subtract') newQty -= parseInt(quantity);
    else newQty = parseInt(quantity);

    await db.products.update(
      { _id: req.params.id },
      { $set: { quantity: Math.max(0, newQty), updatedAt: new Date() } }
    );

    await db.inventory.insert({
      productId: req.params.id,
      productName: product.name,
      previousQuantity: product.quantity,
      newQuantity: Math.max(0, newQty),
      change: newQty - product.quantity,
      operation,
      reason: reason || '',
      createdAt: new Date(),
    });

    res.json({ success: true, newQuantity: Math.max(0, newQty) });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Inventory count (جرد)
router.post('/inventory/count', async (req, res) => {
  try {
    const { items } = req.body; // [{ productId, actualQuantity, variantId? }]
    const results = [];
    
    for (const item of items) {
      if (item.variantId) {
        const variant = await db.variants.findOne({ _id: item.variantId });
        if (variant) {
          const diff = item.actualQuantity - variant.quantity;
          await db.variants.update({ _id: item.variantId }, { $set: { quantity: item.actualQuantity } });
          results.push({ variantId: item.variantId, systemQty: variant.quantity, actualQty: item.actualQuantity, diff });
          
          await db.inventory.insert({
            productId: variant.productId,
            variantId: item.variantId,
            previousQuantity: variant.quantity,
            newQuantity: item.actualQuantity,
            change: diff,
            operation: 'inventory_count',
            createdAt: new Date(),
          });
        }
      } else {
        const product = await db.products.findOne({ _id: item.productId });
        if (product) {
          const diff = item.actualQuantity - product.quantity;
          await db.products.update({ _id: item.productId }, { $set: { quantity: item.actualQuantity, updatedAt: new Date() } });
          results.push({ productId: item.productId, name: product.name, systemQty: product.quantity, actualQty: item.actualQuantity, diff });
          
          await db.inventory.insert({
            productId: item.productId,
            productName: product.name,
            previousQuantity: product.quantity,
            newQuantity: item.actualQuantity,
            change: diff,
            operation: 'inventory_count',
            createdAt: new Date(),
          });
        }
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ في الجرد' });
  }
});

// Get expiring products
router.get('/alerts/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + parseInt(days));
    
    const products = await db.products.find({
      expiryDate: { $lte: alertDate.toISOString(), $gte: new Date().toISOString() }
    });
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

// Get low stock products
router.get('/alerts/lowstock', async (req, res) => {
  try {
    const products = await db.products.find({});
    const lowStock = products.filter(p => p.quantity <= (p.minStock || 5));
    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ' });
  }
});

module.exports = router;
