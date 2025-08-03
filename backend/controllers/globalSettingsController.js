const GlobalSettings = require('../models/GlobalSettings');

// Get global settings (singleton)
exports.getGlobalSettings = async (req, res) => {
  try {
    const settings = await GlobalSettings.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global settings' });
  }
};

// Update global settings (admin only)
exports.updateGlobalSettings = async (req, res) => {
  try {
    const { companyName, companyLogo, referenceFormat } = req.body;
    const settings = await GlobalSettings.getSettings();
    if (companyName !== undefined) settings.companyName = companyName;
    if (companyLogo !== undefined) settings.companyLogo = companyLogo;
    if (referenceFormat !== undefined) settings.referenceFormat = referenceFormat;
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update global settings' });
  }
};
