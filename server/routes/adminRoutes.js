import express from 'express';
import User from '../models/User.js';
import LookupData from '../models/LookupData.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const users = await User.find().sort({ role: 1, displayName: 1 });
  res.json({ users });
});

// Pre-register / whitelist a faculty or coordinator Gmail with exact sheet tab name
router.post('/users/whitelist', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, displayName, role = 'staff', googleSheetUrl = '' } = req.body;
    if (!email || !displayName) {
      return res.status(400).json({ message: 'Email and Sheet Tab Display Name are required.' });
    }

    const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const googleSheetId = match ? match[1] : '';

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        role,
        isWhitelisted: true,
        isActive: true,
        ...(googleSheetUrl && { googleSheetUrl: googleSheetUrl.trim(), googleSheetId }),
      },
      { upsert: true, new: true }
    );

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Error saving whitelisted user.' });
  }
});

// Update user role / active status / display name
router.patch('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, displayName, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...(role && { role }), ...(displayName && { displayName }), ...(typeof isActive === 'boolean' && { isActive }) },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user.' });
  }
});

// Get Lookup Data (Mediums, Faculty Phones, Coordinators)
router.get('/lookups', requireAuth, async (req, res) => {
  let lookups = await LookupData.findOne({ key: 'GLOBAL_LOOKUPS' });
  if (!lookups) {
    lookups = await LookupData.create({ key: 'GLOBAL_LOOKUPS' });
  }
  res.json({ lookups });
});


// Update Lookup Data (Mediums, Faculty Phones 01-06, Coordinators)
router.put('/lookups', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { mediums, facultyPhones, coordinators } = req.body;
    const lookups = await LookupData.findOneAndUpdate(
      { key: 'GLOBAL_LOOKUPS' },
      {
        ...(Array.isArray(mediums) && { mediums }),
        ...(Array.isArray(facultyPhones) && { facultyPhones }),
        ...(Array.isArray(coordinators) && { coordinators }),
      },
      { upsert: true, new: true }
    );
    res.json({ lookups });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update lookup lists.' });
  }
});

export default router;