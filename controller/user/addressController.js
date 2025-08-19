const Address = require("../../models/addressSchema")
const mongoose = require("mongoose")

const addressController = {
  // Get all addresses for a user
  getAddresses: async (req, res) => {
    try {
      const userId = req.session.user;
      if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
      
      const addresses = await Address.find({ userId });
      res.json({ success: true, addresses });
    } catch (error) {
      console.error('Error fetching addresses:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching addresses' });
    }
  },
  
  // Get a single address by ID
  getAddressById: async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = req.session.user;
      
      const address = await Address.findOne({ _id: addressId, userId });
      
      if (!address) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }
      
      res.json(address);
    } catch (error) {
      console.error('Error fetching address:', error);
      res.status(500).json({ success: false, message: 'Server error while fetching address' });
    }
  },
  
  // Add a new address
  addAddress: async (req, res) => {
    try {
      const userId = req.session.user;
      if (!userId) return res.status(401).json({ success: false, message: 'User not authenticated' });
      
      const addressData = req.body;
      addressData.userId = userId;
      
      // If this address is set as default, unset any other default addresses
      if (addressData.isDefault) {
        await Address.updateMany({ userId }, { $set: { isDefault: false } });
      }
      
      const newAddress = new Address(addressData);
      await newAddress.save();
      
      res.json({ success: true, message: 'Address added successfully', address: newAddress });
    } catch (error) {
      console.error('Error adding address:', error);
      res.status(500).json({ success: false, message: 'Server error while adding address' });
    }
  },
  
  // Update an existing address
  updateAddress: async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = req.session.user;
      
      // Check if address exists and belongs to user
      const existingAddress = await Address.findOne({ _id: addressId, userId });
      if (!existingAddress) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }
      
      const addressData = req.body;
      
      // If this address is being set as default, unset any other default addresses
      if (addressData.isDefault) {
        await Address.updateMany({ userId, _id: { $ne: addressId } }, { $set: { isDefault: false } });
      }
      
      // Update the address
      const updatedAddress = await Address.findByIdAndUpdate(
        addressId,
        { $set: addressData },
        { new: true }
      );
      
      res.json({ success: true, message: 'Address updated successfully', address: updatedAddress });
    } catch (error) {
      console.error('Error updating address:', error);
      res.status(500).json({ success: false, message: 'Server error while updating address' });
    }
  },
  
  // Delete an address
  deleteAddress: async (req, res) => {
    try {
      const addressId = req.params.id;
      const userId = req.session.user;
      
      // Check if address exists and belongs to user
      const existingAddress = await Address.findOne({ _id: addressId, userId });
      if (!existingAddress) {
        return res.status(404).json({ success: false, message: 'Address not found' });
      }
      
      // Check if this was the default address
      const wasDefault = existingAddress.isDefault;
      
      // Delete the address
      await Address.findByIdAndDelete(addressId);
      
      // If deleted address was default, set another address as default
      if (wasDefault) {
        const anotherAddress = await Address.findOne({ userId });
        if (anotherAddress) {
          anotherAddress.isDefault = true;
          await anotherAddress.save();
        }
      }
      
      res.json({ success: true, message: 'Address deleted successfully' });
    } catch (error) {
      console.error('Error deleting address:', error);
      res.status(500).json({ success: false, message: 'Server error while deleting address' });
    }
  }
};

module.exports = addressController;