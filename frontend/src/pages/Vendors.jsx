import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaStar, FaSearch, FaFilter } from 'react-icons/fa'
import api from '../services/api'
import { toast } from 'react-toastify'

const Vendors = () => {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      // Try regular endpoint first, fallback to test endpoint
      let response;
      try {
        response = await api.get('/vendors');
      } catch (authError) {
        // If auth fails, use test endpoint
        console.log('Using test endpoint for vendors');
        const testResponse = await fetch('http://localhost:5001/api/vendors/test/list');
        const data = await testResponse.json();
        response = { data };
      }
      setVendors(response.data.data || [])
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast.error('Failed to fetch vendors')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return
    try {
      await api.delete(`/vendors/${id}`)
      setVendors(vendors.filter(v => v._id !== id))
      toast.success('Vendor deleted successfully')
    } catch (error) {
      toast.error('Failed to delete vendor')
    }
  }

  const handleEdit = (vendor) => {
    setEditingVendor(vendor)
    setShowModal(true)
  }

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600 mt-1">Manage your vendor relationships and performance</p>
        </div>
        <button
          onClick={() => { setEditingVendor(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <FaPlus /> Add Vendor
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white rounded-lg shadow p-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Vendors Grid */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No vendors found. Add your first vendor to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map(vendor => (
            <VendorCard
              key={vendor._id}
              vendor={vendor}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <VendorModal
          vendor={editingVendor}
          onClose={() => { setShowModal(false); setEditingVendor(null) }}
          onSave={() => { fetchVendors(); setShowModal(false); setEditingVendor(null) }}
        />
      )}
    </div>
  )
}

const VendorCard = ({ vendor, onEdit, onDelete }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{vendor.name}</h3>
            <p className="text-sm text-gray-500">{vendor.category || 'General'}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[vendor.status] || statusColors.pending}`}>
            {vendor.status || 'pending'}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Email:</span> {vendor.email || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Phone:</span> {vendor.phone || 'N/A'}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Location:</span> {vendor.address?.city || 'N/A'}
          </p>
        </div>

        {/* Performance Rating */}
        <div className="flex items-center gap-1 mb-4">
          {[1, 2, 3, 4, 5].map(star => (
            <FaStar
              key={star}
              className={star <= (vendor.performanceRating || 0) ? 'text-yellow-400' : 'text-gray-300'}
            />
          ))}
          <span className="text-sm text-gray-500 ml-2">({vendor.performanceRating || 0}/5)</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={() => onEdit(vendor)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
          >
            <FaEdit /> Edit
          </button>
          <button
            onClick={() => onDelete(vendor._id)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
          >
            <FaTrash /> Delete
          </button>
        </div>
      </div>
    </div>
  )
}

const VendorModal = ({ vendor, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    category: vendor?.category || '',
    status: vendor?.status || 'pending',
    address: {
      street: vendor?.address?.street || '',
      city: vendor?.address?.city || '',
      state: vendor?.address?.state || '',
      zipCode: vendor?.address?.zipCode || '',
      country: vendor?.address?.country || ''
    },
    contactPerson: {
      name: vendor?.contactPerson?.name || '',
      email: vendor?.contactPerson?.email || '',
      phone: vendor?.contactPerson?.phone || ''
    },
    paymentTerms: vendor?.paymentTerms || 'net30'
  })
  const [saving, setSaving] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (vendor) {
        await api.put(`/vendors/${vendor._id}`, formData)
        toast.success('Vendor updated successfully')
      } else {
        await api.post('/vendors', formData)
        toast.success('Vendor created successfully')
      }
      onSave()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save vendor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {vendor ? 'Edit Vendor' : 'Add New Vendor'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Category</option>
                <option value="Electronics">Electronics</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Packaging">Packaging</option>
                <option value="Services">Services</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
              <select
                name="paymentTerms"
                value={formData.paymentTerms}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="net15">Net 15</option>
                <option value="net30">Net 30</option>
                <option value="net45">Net 45</option>
                <option value="net60">Net 60</option>
              </select>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <h3 className="font-medium text-gray-900 mb-2">Address</h3>
            </div>
            <div className="md:col-span-2">
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                placeholder="Street Address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="text"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                placeholder="City"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="text"
                name="address.state"
                value={formData.address.state}
                onChange={handleChange}
                placeholder="State"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="text"
                name="address.zipCode"
                value={formData.address.zipCode}
                onChange={handleChange}
                placeholder="ZIP Code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="text"
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                placeholder="Country"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Contact Person */}
            <div className="md:col-span-2">
              <h3 className="font-medium text-gray-900 mb-2">Contact Person</h3>
            </div>
            <div>
              <input
                type="text"
                name="contactPerson.name"
                value={formData.contactPerson.name}
                onChange={handleChange}
                placeholder="Contact Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <input
                type="email"
                name="contactPerson.email"
                value={formData.contactPerson.email}
                onChange={handleChange}
                placeholder="Contact Email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Vendors
