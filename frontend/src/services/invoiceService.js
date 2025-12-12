/**
 * Invoice Service
 * API client for Automated Invoicing operations
 */

import api from './api';

class InvoiceService {
  /**
   * Submit a new invoice
   */
  async submitInvoice(invoiceData) {
    try {
      const response = await api.post('/invoices', invoiceData);
      return response.data;
    } catch (error) {
      console.error('Submit invoice error:', error);
      throw error;
    }
  }

  /**
   * Get all invoices with filters
   */
  async getInvoices(filters = {}) {
    try {
      const response = await api.get('/invoices', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get invoices error:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(invoiceId) {
    try {
      const response = await api.get(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Get invoice by ID error:', error);
      throw error;
    }
  }

  /**
   * Update invoice
   */
  async updateInvoice(invoiceId, updates) {
    try {
      const response = await api.put(`/invoices/${invoiceId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Update invoice error:', error);
      throw error;
    }
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(invoiceId) {
    try {
      const response = await api.delete(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Delete invoice error:', error);
      throw error;
    }
  }

  /**
   * Email ingestion
   */
  async submitViaEmail(emailData) {
    try {
      const response = await api.post('/invoices/email-ingestion', emailData);
      return response.data;
    } catch (error) {
      console.error('Email ingestion error:', error);
      throw error;
    }
  }

  /**
   * Mobile upload
   */
  async uploadViaMobile(mobileData) {
    try {
      const response = await api.post('/invoices/mobile-upload', mobileData);
      return response.data;
    } catch (error) {
      console.error('Mobile upload error:', error);
      throw error;
    }
  }

  /**
   * EDI submission
   */
  async submitViaEDI(ediData) {
    try {
      const response = await api.post('/invoices/edi', ediData);
      return response.data;
    } catch (error) {
      console.error('EDI submission error:', error);
      throw error;
    }
  }

  /**
   * Bulk upload
   */
  async bulkUpload(formData) {
    try {
      const response = await api.post('/invoices/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
    }
  }

  /**
   * Process invoice (OCR + matching + validation)
   */
  async processInvoice(invoiceId) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/process`);
      return response.data;
    } catch (error) {
      console.error('Process invoice error:', error);
      throw error;
    }
  }

  /**
   * Get match results
   */
  async getMatchResults(invoiceId) {
    try {
      const response = await api.get(`/invoices/${invoiceId}/match`);
      return response.data;
    } catch (error) {
      console.error('Get match results error:', error);
      throw error;
    }
  }

  /**
   * Force match (manual override)
   */
  async forceMatch(invoiceId, matchData) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/force-match`, matchData);
      return response.data;
    } catch (error) {
      console.error('Force match error:', error);
      throw error;
    }
  }

  /**
   * Get tax validation results
   */
  async getTaxValidation(invoiceId) {
    try {
      const response = await api.get(`/invoices/${invoiceId}/tax-validation`);
      return response.data;
    } catch (error) {
      console.error('Get tax validation error:', error);
      throw error;
    }
  }

  /**
   * Validate tax manually
   */
  async validateTax(invoiceId, taxData) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/validate-tax`, taxData);
      return response.data;
    } catch (error) {
      console.error('Validate tax error:', error);
      throw error;
    }
  }

  /**
   * Approve invoice
   */
  async approveInvoice(invoiceId, approvalData) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/approve`, approvalData);
      return response.data;
    } catch (error) {
      console.error('Approve invoice error:', error);
      throw error;
    }
  }

  /**
   * Reject invoice
   */
  async rejectInvoice(invoiceId, rejectionData) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/reject`, rejectionData);
      return response.data;
    } catch (error) {
      console.error('Reject invoice error:', error);
      throw error;
    }
  }

  /**
   * Put invoice on hold
   */
  async holdInvoice(invoiceId, holdData) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/hold`, holdData);
      return response.data;
    } catch (error) {
      console.error('Hold invoice error:', error);
      throw error;
    }
  }

  /**
   * Get exceptions
   */
  async getExceptions(filters = {}) {
    try {
      const response = await api.get('/invoices/exceptions', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get exceptions error:', error);
      throw error;
    }
  }

  /**
   * Resolve exception
   */
  async resolveException(exceptionId, resolutionData) {
    try {
      const response = await api.post(`/invoices/exceptions/${exceptionId}/resolve`, resolutionData);
      return response.data;
    } catch (error) {
      console.error('Resolve exception error:', error);
      throw error;
    }
  }

  /**
   * Get payment instruction
   */
  async getPaymentInstruction(invoiceId) {
    try {
      const response = await api.get(`/invoices/${invoiceId}/payment`);
      return response.data;
    } catch (error) {
      console.error('Get payment instruction error:', error);
      throw error;
    }
  }

  /**
   * Schedule payment
   */
  async schedulePayment(invoiceId, paymentData) {
    try {
      const response = await api.post(`/invoices/${invoiceId}/schedule-payment`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Schedule payment error:', error);
      throw error;
    }
  }

  /**
   * Get evidence bundle
   */
  async getEvidenceBundle(invoiceId) {
    try {
      const response = await api.get(`/invoices/${invoiceId}/evidence-bundle`);
      return response.data;
    } catch (error) {
      console.error('Get evidence bundle error:', error);
      throw error;
    }
  }

  /**
   * Get analytics
   */
  async getAnalytics(filters = {}) {
    try {
      const response = await api.get('/invoices/analytics', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  }

  /**
   * Get aging report
   */
  async getAgingReport(filters = {}) {
    try {
      const response = await api.get('/invoices/aging-report', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get aging report error:', error);
      throw error;
    }
  }

  /**
   * Upload invoice file with OCR processing
   */
  async uploadInvoiceFile(file, metadata = {}) {
    try {
      const formData = new FormData();
      formData.append('invoice', file);
      formData.append('metadata', JSON.stringify(metadata));

      const response = await api.post('/invoices', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload invoice file error:', error);
      throw error;
    }
  }

  /**
   * Get invoice statistics
   */
  async getStatistics(filters = {}) {
    try {
      const analytics = await this.getAnalytics(filters);
      return {
        totalInvoices: analytics.totalInvoices || 0,
        totalAmount: analytics.totalAmount || 0,
        pendingApproval: analytics.pendingApproval || 0,
        exceptions: analytics.exceptions || 0,
        processed: analytics.processed || 0,
        byStatus: analytics.byStatus || {},
        byVendor: analytics.byVendor || [],
        trends: analytics.trends || []
      };
    } catch (error) {
      console.error('Get statistics error:', error);
      throw error;
    }
  }

  /**
   * Search invoices
   */
  async searchInvoices(searchTerm, filters = {}) {
    try {
      const response = await api.get('/invoices', {
        params: {
          search: searchTerm,
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      console.error('Search invoices error:', error);
      throw error;
    }
  }

  /**
   * Get approval history
   */
  async getApprovalHistory(invoiceId) {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      return invoice.approvalData || {};
    } catch (error) {
      console.error('Get approval history error:', error);
      throw error;
    }
  }

  /**
   * Get audit trail
   */
  async getAuditTrail(invoiceId) {
    try {
      const invoice = await this.getInvoiceById(invoiceId);
      return invoice.auditTrail || [];
    } catch (error) {
      console.error('Get audit trail error:', error);
      throw error;
    }
  }

  /**
   * Batch process invoices
   */
  async batchProcess(invoiceIds) {
    try {
      const promises = invoiceIds.map(id => this.processInvoice(id));
      const results = await Promise.allSettled(promises);
      
      return {
        total: invoiceIds.length,
        successful: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        results: results.map((r, idx) => ({
          invoiceId: invoiceIds[idx],
          status: r.status,
          data: r.status === 'fulfilled' ? r.value : null,
          error: r.status === 'rejected' ? r.reason : null
        }))
      };
    } catch (error) {
      console.error('Batch process error:', error);
      throw error;
    }
  }

  /**
   * Export invoices to CSV
   */
  async exportToCSV(filters = {}) {
    try {
      const response = await api.get('/invoices', {
        params: {
          ...filters,
          format: 'csv'
        },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoices_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return { success: true };
    } catch (error) {
      console.error('Export to CSV error:', error);
      throw error;
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics() {
    try {
      const analytics = await this.getAnalytics();
      const exceptions = await this.getExceptions({ status: 'pending' });
      const aging = await this.getAgingReport();
      
      return {
        summary: {
          totalInvoices: analytics.totalInvoices || 0,
          totalAmount: analytics.totalAmount || 0,
          pendingApproval: analytics.pendingApproval || 0,
          exceptionsCount: exceptions.exceptions?.length || 0,
          averageProcessingTime: analytics.averageProcessingTime || 0,
          autoApprovalRate: analytics.autoApprovalRate || 0
        },
        byStatus: analytics.byStatus || {},
        aging: aging.agingBuckets || [],
        topVendors: analytics.byVendor?.slice(0, 5) || [],
        recentActivity: analytics.recentActivity || [],
        trends: analytics.trends || []
      };
    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      throw error;
    }
  }
}

export default new InvoiceService();
