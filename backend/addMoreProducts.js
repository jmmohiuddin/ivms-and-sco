const mongoose = require('mongoose');
require('dotenv').config();

// Product Schema
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  description: String,
  unit: String,
  price: Number,
  inventory: {
    quantity: Number,
    reorderPoint: Number,
    maxStock: Number
  },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  specifications: mongoose.Schema.Types.Mixed,
  status: { type: String, enum: ['active', 'discontinued', 'out-of-stock'], default: 'active' }
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);

const additionalProducts = [
  { name: 'Wireless Mouse', sku: 'TECH-WM-001', category: 'Electronics', description: 'Ergonomic wireless mouse', unit: 'piece', price: 29.99, inventory: { quantity: 150, reorderPoint: 30, maxStock: 200 }, specifications: { color: 'Black', warranty: '1 year' }, status: 'active' },
  { name: 'USB-C Hub', sku: 'TECH-HUB-002', category: 'Electronics', description: '7-in-1 USB-C hub', unit: 'piece', price: 49.99, inventory: { quantity: 80, reorderPoint: 20, maxStock: 120 }, specifications: { ports: 7, power: '100W' }, status: 'active' },
  { name: 'Laptop Stand', sku: 'OFF-LS-003', category: 'Office Supplies', description: 'Adjustable aluminum laptop stand', unit: 'piece', price: 39.99, inventory: { quantity: 60, reorderPoint: 15, maxStock: 100 }, specifications: { material: 'Aluminum', adjustable: true }, status: 'active' },
  { name: 'Whiteboard Markers', sku: 'OFF-WM-004', category: 'Office Supplies', description: 'Set of 12 dry erase markers', unit: 'set', price: 12.99, inventory: { quantity: 200, reorderPoint: 50, maxStock: 300 }, specifications: { count: 12, colors: 'Assorted' }, status: 'active' },
  { name: 'Printer Paper A4', sku: 'OFF-PP-005', category: 'Office Supplies', description: '500 sheets premium paper', unit: 'ream', price: 8.99, inventory: { quantity: 500, reorderPoint: 100, maxStock: 800 }, specifications: { weight: '80gsm', sheets: 500 }, status: 'active' },
  { name: 'Webcam HD', sku: 'TECH-WC-006', category: 'Electronics', description: '1080p HD webcam', unit: 'piece', price: 79.99, inventory: { quantity: 45, reorderPoint: 10, maxStock: 80 }, specifications: { resolution: '1080p', fps: 30 }, status: 'active' },
  { name: 'Desk Organizer', sku: 'OFF-DO-007', category: 'Office Supplies', description: 'Wooden desk organizer', unit: 'piece', price: 24.99, inventory: { quantity: 75, reorderPoint: 20, maxStock: 120 }, specifications: { material: 'Wood', compartments: 6 }, status: 'active' },
  { name: 'Power Strip', sku: 'TECH-PS-008', category: 'Electronics', description: '6-outlet surge protector', unit: 'piece', price: 19.99, inventory: { quantity: 120, reorderPoint: 30, maxStock: 200 }, specifications: { outlets: 6, surge: '1200J' }, status: 'active' },
  { name: 'Monitor Stand', sku: 'OFF-MS-009', category: 'Office Supplies', description: 'Height adjustable monitor stand', unit: 'piece', price: 34.99, inventory: { quantity: 55, reorderPoint: 15, maxStock: 90 }, specifications: { height: 'Adjustable', capacity: '22kg' }, status: 'active' },
  { name: 'Bluetooth Speaker', sku: 'TECH-BS-010', category: 'Electronics', description: 'Portable Bluetooth speaker', unit: 'piece', price: 59.99, inventory: { quantity: 90, reorderPoint: 20, maxStock: 150 }, specifications: { battery: '12hrs', waterproof: 'IPX7' }, status: 'active' },
  { name: 'Cable Clips', sku: 'OFF-CC-011', category: 'Office Supplies', description: 'Pack of 50 cable clips', unit: 'pack', price: 6.99, inventory: { quantity: 300, reorderPoint: 80, maxStock: 500 }, specifications: { count: 50, adhesive: true }, status: 'active' },
  { name: 'Keyboard Wireless', sku: 'TECH-KB-012', category: 'Electronics', description: 'Wireless mechanical keyboard', unit: 'piece', price: 89.99, inventory: { quantity: 40, reorderPoint: 10, maxStock: 70 }, specifications: { type: 'Mechanical', backlit: true }, status: 'active' },
  { name: 'Notepad Set', sku: 'OFF-NP-013', category: 'Office Supplies', description: 'Set of 5 ruled notepads', unit: 'set', price: 9.99, inventory: { quantity: 180, reorderPoint: 40, maxStock: 250 }, specifications: { count: 5, pages: '100 each' }, status: 'active' },
  { name: 'USB Flash Drive 32GB', sku: 'TECH-USB-014', category: 'Electronics', description: '32GB USB 3.0 flash drive', unit: 'piece', price: 15.99, inventory: { quantity: 200, reorderPoint: 50, maxStock: 300 }, specifications: { capacity: '32GB', speed: 'USB 3.0' }, status: 'active' },
  { name: 'Stapler Heavy Duty', sku: 'OFF-ST-015', category: 'Office Supplies', description: 'Heavy duty stapler', unit: 'piece', price: 18.99, inventory: { quantity: 85, reorderPoint: 20, maxStock: 130 }, specifications: { capacity: '100 sheets', staples: '23/13' }, status: 'active' },
  { name: 'Headphones Noise Cancel', sku: 'TECH-HP-016', category: 'Electronics', description: 'Noise cancelling headphones', unit: 'piece', price: 149.99, inventory: { quantity: 35, reorderPoint: 8, maxStock: 60 }, specifications: { noise_cancel: true, battery: '30hrs' }, status: 'active' },
  { name: 'Binder Clips Large', sku: 'OFF-BC-017', category: 'Office Supplies', description: 'Box of 12 large binder clips', unit: 'box', price: 4.99, inventory: { quantity: 250, reorderPoint: 60, maxStock: 400 }, specifications: { count: 12, size: 'Large' }, status: 'active' },
  { name: 'External Hard Drive 1TB', sku: 'TECH-HD-018', category: 'Electronics', description: '1TB external hard drive', unit: 'piece', price: 69.99, inventory: { quantity: 55, reorderPoint: 15, maxStock: 90 }, specifications: { capacity: '1TB', interface: 'USB 3.0' }, status: 'active' },
  { name: 'Desk Calendar 2026', sku: 'OFF-DC-019', category: 'Office Supplies', description: '2026 desk calendar', unit: 'piece', price: 11.99, inventory: { quantity: 140, reorderPoint: 30, maxStock: 200 }, specifications: { year: '2026', size: 'A4' }, status: 'active' },
  { name: 'Surge Protector Tower', sku: 'TECH-SPT-020', category: 'Electronics', description: 'Tower surge protector with USB', unit: 'piece', price: 44.99, inventory: { quantity: 65, reorderPoint: 15, maxStock: 100 }, specifications: { outlets: 12, usb_ports: 5 }, status: 'active' }
];

async function addProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get first vendor as default
    const Vendor = mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));
    const vendors = await Vendor.find().limit(3);
    
    if (vendors.length === 0) {
      console.log('❌ No vendors found. Please run seedData.js first');
      process.exit(1);
    }

    // Assign vendors to products
    const productsWithVendors = additionalProducts.map((product, index) => ({
      ...product,
      vendor: vendors[index % vendors.length]._id
    }));

    // Insert products
    const result = await Product.insertMany(productsWithVendors);
    console.log(`✅ Added ${result.length} new products`);

    // Show total count
    const totalCount = await Product.countDocuments();
    console.log(`📦 Total products in database: ${totalCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addProducts();
