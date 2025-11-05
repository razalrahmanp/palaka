"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Plus, 
  Trash2, 
  Phone,
  Mail,
  MapPin,
  X,
  RefreshCw,
  Calendar,
  Hash,
  Printer,
  ShoppingCart,
  Send,
  Save,
  Edit,
  FileText,
  User,
  Receipt,
  Loader2,
} from "lucide-react";
import { ProductWithInventory, BillingCustomer, BillingItem, CustomProduct, PaymentMethod, BillingData, Invoice } from "@/types";
import { BajajFinanceCalculator, BajajFinanceData } from './BajajFinanceCalculator';
import { PaymentTrackingDialog } from '../finance/PaymentTrackingDialog';
import { CustomerForm } from '../crm/CustomerForm';

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  address?: string;
}

interface EmployeeData {
  id: string;
  name: string;
  email?: string;
  user?: { id: string } | null;
  user_id?: string;
}

interface InvoiceBillingProps {
  onSave?: (data: BillingData) => void;
  onCreateQuoteAndSalesOrder?: (data: BillingData) => void;
  isProcessing?: boolean;
  quoteGenerated?: boolean;
  quoteStatus?: string;
  initialData?: {
    type: 'quote' | 'order';
    data: Record<string, unknown>;
    isEditing: boolean;
    existingId: string;
    existingQuoteId?: string;
    existingStatus: string;
  } | null;
  onDataLoaded?: () => void;
}

export function InvoiceBillingDashboard({
  onSave,
  onCreateQuoteAndSalesOrder,
  isProcessing: externalIsProcessing = false,
  quoteGenerated = false,
  quoteStatus = '',
  initialData = null,
  onDataLoaded
}: InvoiceBillingProps) {
  // Core State
  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [notes, setNotes] = useState('');
  
  // Invoice Details
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(''); // Changed from dueDate to deliveryDate
  
  // Search & Product States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductWithInventory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Customer States - Updated to match database schema
  const [customerForm, setCustomerForm] = useState<Partial<BillingCustomer>>({
    customer_id: '',
    name: '', // Required field
    phone: '',
    email: '',
    address: '', // Required field
    floor: '', // Required field as per DB schema
    city: '',
    state: '',
    pincode: '',
    notes: '',
    tags: [], // Purpose of visit and other tags
    latitude: undefined,
    longitude: undefined,
    formatted_address: '',
    status: 'Lead', // Default status
    source: 'billing_system' // Default source for billing system
  });
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<BillingCustomer[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editCustomerModalOpen, setEditCustomerModalOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<BillingCustomer | null>(null);
  
  // Invoice Creation States
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    amount: '',
    description: '',
    notes: '',
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [showInvoiceCustomerDropdown, setShowInvoiceCustomerDropdown] = useState(false);
  
  // Custom Product States
  const [showCustomProductForm, setShowCustomProductForm] = useState(false);
  const [customProductForm, setCustomProductForm] = useState<CustomProduct>({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    price: 0,
    cost_price: null, // Add cost_price field
    material: '',
    lead_time_days: 30,
    supplier_id: '',
    supplier_name: ''
  });
  
  // Supplier States - Enhanced for searchable dropdown
  const [availableSuppliers, setAvailableSuppliers] = useState<Supplier[]>([]);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [supplierSearchResults, setSupplierSearchResults] = useState<Supplier[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  
  // Pricing States
  const [globalDiscount, setGlobalDiscount] = useState(0);
  
  // State to track database values for UI display when loading existing orders
  const [loadedDatabaseValues, setLoadedDatabaseValues] = useState<{
    final_price?: number;
    discount_amount?: number;
    isLoaded: boolean;
    isModified: boolean; // Track if order has been modified since loading
  }>({ isLoaded: false, isModified: false });
  
  // State to track original loaded items for comparison
  const [originalLoadedItems, setOriginalLoadedItems] = useState<BillingItem[]>([]);
  const [taxPercentage, setTaxPercentage] = useState(0); // Default to 0% tax unless specified
  const [freightCharges, setFreightCharges] = useState(0);
  const [deliveryFloor, setDeliveryFloor] = useState('ground'); // New floor selection
  const [isFirstFloorAwareness, setIsFirstFloorAwareness] = useState(false); // Track 1st floor awareness
  const [showPaymentTracker, setShowPaymentTracker] = useState(false); // Payment tracking modal
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null); // Store generated invoice for payment tracking
  
  // Payment States
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // Bajaj Finance States
  const [showBajajFinance, setShowBajajFinance] = useState(false);
  const [bajajFinanceData, setBajajFinanceData] = useState<BajajFinanceData | null>(null);
  
  // Salesman/Employee Selection States - Enhanced for searchable dropdown
  const [selectedSalesman, setSelectedSalesman] = useState<{ id: string; name: string; email?: string; user_id?: string } | null>(null);
  const [availableSalespeople, setAvailableSalespeople] = useState<{ id: string; name: string; email?: string; user_id?: string }[]>([]);
  const [salespersonSearchQuery, setSalespersonSearchQuery] = useState('');
  const [salespersonSearchResults, setSalespersonSearchResults] = useState<{ id: string; name: string; email?: string; user_id?: string }[]>([]);
  const [showSalespersonDropdown, setShowSalespersonDropdown] = useState(false);

  // UI States
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate effective item data including global discount distribution


  // Calculations - Use original items, global discount handled separately
  const originalTotal = Math.round((items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0)) * 100) / 100;
  const itemsSubtotal = Math.round((items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0)) * 100) / 100;
  
  // Calculate individual item discounts (not including global discount)
  const itemDiscountAmount = Math.round((originalTotal - itemsSubtotal) * 100) / 100;
  
  const totalDiscountAmount = itemDiscountAmount + globalDiscount;
  
  // For loaded sales orders that haven't been modified, use database values for display
  // Once modified, switch to calculated values
  const useCalculatedValues = !loadedDatabaseValues.isLoaded || loadedDatabaseValues.isModified;
  
  const displayTotalDiscountAmount = useCalculatedValues
    ? totalDiscountAmount
    : (loadedDatabaseValues.discount_amount || 0);
  
  // Subtotal after all discounts
  const subtotal = Math.round((itemsSubtotal - globalDiscount) * 100) / 100;
  
  const taxableAmount = Math.round(subtotal * 100) / 100;
  const taxAmount = Math.round((taxableAmount * taxPercentage / 100) * 100) / 100;
  const calculatedGrandTotal = Math.round((taxableAmount + taxAmount + freightCharges) * 100) / 100;
  
  // For loaded sales orders that haven't been modified, use database final_price for grand total display
  // Once modified, switch to calculated values
  const displayGrandTotal = useCalculatedValues
    ? calculatedGrandTotal
    : (loadedDatabaseValues.final_price || 0);
  


  // Helper function to get current billing data
  const getCurrentBillingData = (): BillingData => ({
    customer,
    items: items, // Use original items without global discount distribution
    paymentMethods,
    finalTotal: calculatedGrandTotal,
    notes,
    deliveryDate,
    deliveryFloor, // Include floor selection
    isFirstFloorAwareness, // Include awareness flag
    selectedSalesman,
    bajajFinanceData, // Include Bajaj Finance data with card status
    invoiceDate, // Include invoice date for API
    totals: {
      original_price: originalTotal,
      total_price: subtotal,
      final_price: calculatedGrandTotal, // This is what customer actually pays
      discount_amount: totalDiscountAmount,
      subtotal: taxableAmount,
      tax: taxAmount,
      tax_percentage: taxPercentage,
      freight_charges: freightCharges,
      grandTotal: calculatedGrandTotal
    }
  });

  // Generate invoice number
  useEffect(() => {
    if (!invoiceNumber) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
      setInvoiceNumber(`INV-${year}${month}${day}-${time}`);
    }
  }, [invoiceNumber]);

  // Set delivery date (30 days from invoice date)
  useEffect(() => {
    if (invoiceDate && !deliveryDate) {
      const invoice = new Date(invoiceDate);
      const delivery = new Date(invoice);
      delivery.setDate(delivery.getDate() + 30);
      setDeliveryDate(delivery.toISOString().split('T')[0]);
    }
  }, [invoiceDate, deliveryDate]);

  // Fetch salespeople on component mount
  const fetchSalespeople = useCallback(async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (response.ok) {
        const employees: EmployeeData[] = await response.json();
        const salespeople = employees.map((emp) => ({
          id: emp.id,
          name: String(emp.name || ''),
          email: String(emp.email || ''),
          user_id: emp.user?.id || emp.user_id
        }));
        setAvailableSalespeople(salespeople);
        setSalespersonSearchResults(salespeople); // Initialize search results
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  }, []);

  // Search Salespeople
  const searchSalespeople = useCallback((query: string) => {
    if (!query.trim()) {
      setSalespersonSearchResults(availableSalespeople);
      return;
    }

    const filtered = availableSalespeople.filter(person =>
      person.name.toLowerCase().includes(query.toLowerCase()) ||
      person.email?.toLowerCase().includes(query.toLowerCase())
    );
    setSalespersonSearchResults(filtered);
  }, [availableSalespeople]);

  // Fetch suppliers for custom products
  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await fetch('/api/suppliers');
      if (response.ok) {
        const suppliers: Supplier[] = await response.json();
        setAvailableSuppliers(suppliers);
        setSupplierSearchResults(suppliers); // Initialize search results with all suppliers
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }, []);

  // Clear validation errors when user starts fixing them
  const clearValidationErrors = useCallback(() => {
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  }, [validationErrors.length]);

  // Search Suppliers for custom products
  const searchSuppliers = useCallback((query: string) => {
    if (!query.trim()) {
      setSupplierSearchResults(availableSuppliers);
      return;
    }

    const filtered = availableSuppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(query.toLowerCase()) ||
      supplier.contact?.toLowerCase().includes(query.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(query.toLowerCase())
    );
    setSupplierSearchResults(filtered);
  }, [availableSuppliers]);

  useEffect(() => {
    fetchSalespeople();
    fetchSuppliers();
  }, [fetchSalespeople, fetchSuppliers]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (showSupplierDropdown) {
        if (!target.closest('#custom-supplier') && !target.closest('.supplier-dropdown')) {
          setShowSupplierDropdown(false);
        }
      }
      
      if (showSalespersonDropdown) {
        if (!target.closest('#salesperson-search') && !target.closest('.salesperson-dropdown')) {
          setShowSalespersonDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSupplierDropdown, showSalespersonDropdown]);

  // Search Products
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/products/search?name=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('🔍 Product search results:', data.products);
        setSearchResults(data.products || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Search Customers - Updated to use proper CRM API
  const searchCustomers = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/crm/customers/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      
      if (response.ok) {
        setCustomerSearchResults(data.customers || []);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
    }
  }, []);

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery, searchCustomers]);

  // Handle Edit Customer
  const handleEditCustomer = (customerData: BillingCustomer) => {
    setSelectedCustomerForEdit(customerData);
    setEditCustomerModalOpen(true);
  };

  // Handle Save Customer from Edit
  const handleSaveEditedCustomer = async (data: {
    name: string;
    email?: string;
    phone?: string;
    status: string;
    source: string;
    tags: string[];
    assigned_sales_rep_id?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    floor?: string;
    customer_visit_date?: string;
    notes?: string;
  }) => {
    if (!selectedCustomerForEdit) return;

    try {
      const response = await fetch(`/api/crm/customers/${selectedCustomerForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCustomerForEdit.id,
          ...data,
          email: data.email?.trim() || undefined,
          phone: data.phone?.trim() || undefined,
          address: data.address?.trim() || undefined,
          city: data.city?.trim() || undefined,
          state: data.state?.trim() || undefined,
          pincode: data.pincode?.trim() || undefined,
          floor: data.floor?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
          customer_visit_date: data.customer_visit_date || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error updating customer:', error);
        alert('Failed to update customer: ' + (error.error || 'Unknown error'));
        return;
      }

      // Update current customer if it's the one being edited
      if (customer?.id === selectedCustomerForEdit.id) {
        // Refresh customer data from API
        const refreshResponse = await fetch(`/api/crm/customers/search?q=${encodeURIComponent(customer?.name || '')}&limit=1`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.customers && refreshData.customers.length > 0) {
            setCustomer(refreshData.customers[0]);
          }
        }
      }

      // Refresh search results
      if (customerSearchQuery) {
        searchCustomers(customerSearchQuery);
      }

      setEditCustomerModalOpen(false);
      setSelectedCustomerForEdit(null);
    } catch (error) {
      console.error('Failed to update customer:', error);
      alert('Failed to update customer');
    }
  };

  // Handle invoice customer selection
  const handleInvoiceCustomerSelect = (customer: { name: string; phone?: string; email?: string }) => {
    setInvoiceForm(prev => ({
      ...prev,
      customer_name: customer.name,
      customer_phone: customer.phone || '',
      customer_email: customer.email || ''
    }));
    setShowInvoiceCustomerDropdown(false);
  };

  // Handle create standalone invoice
  const handleCreateInvoice = async () => {
    // Validation
    if (!invoiceForm.customer_name.trim()) {
      alert('Please enter a customer name');
      return;
    }

    if (!invoiceForm.amount || parseFloat(invoiceForm.amount) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    if (!invoiceForm.description.trim()) {
      alert('Please enter a description for the invoice');
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const response = await fetch('/api/finance/standalone-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: invoiceForm.customer_name,
          customer_phone: invoiceForm.customer_phone || null,
          customer_email: invoiceForm.customer_email || null,
          amount: parseFloat(invoiceForm.amount),
          description: invoiceForm.description,
          notes: invoiceForm.notes || null,
          date: invoiceForm.date
        }),
      });

      if (response.ok) {
        setCreateInvoiceOpen(false);
        setInvoiceForm({
          date: new Date().toISOString().split('T')[0],
          customer_name: '',
          customer_phone: '',
          customer_email: '',
          amount: '',
          description: '',
          notes: '',
        });
        alert('Invoice created successfully with automatic journal entry!');
      } else {
        const error = await response.json();
        alert(`Failed to create invoice: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Detect when items have been modified to switch from database values to calculated values
  useEffect(() => {
    if (loadedDatabaseValues.isLoaded && !loadedDatabaseValues.isModified) {
      // Check if items have been modified by comparing with original loaded items
      const hasItemsChanged = originalLoadedItems.length !== items.length ||
        items.some((item, index) => {
          const originalItem = originalLoadedItems[index];
          if (!originalItem) return true;
          
          return (
            item.quantity !== originalItem.quantity ||
            item.finalPrice !== originalItem.finalPrice ||
            item.originalPrice !== originalItem.originalPrice ||
            item.discountAmount !== originalItem.discountAmount ||
            item.id !== originalItem.id
          );
        });
      
      // Check if global discount has been changed from the prefilled value
      const originalGlobalDiscount = Math.max(0, (loadedDatabaseValues.discount_amount || 0) - 
        originalLoadedItems.reduce((sum: number, item: BillingItem) => sum + (item.discountAmount || 0), 0));
      const hasGlobalDiscountChanged = Math.abs(globalDiscount - originalGlobalDiscount) > 0.01;
      
      if (hasItemsChanged || hasGlobalDiscountChanged) {
        console.log("Order has been modified - switching to calculated values", {
          hasItemsChanged,
          hasGlobalDiscountChanged,
          originalItemsCount: originalLoadedItems.length,
          currentItemsCount: items.length,
          originalGlobalDiscount,
          currentGlobalDiscount: globalDiscount
        });
        
        setLoadedDatabaseValues(prev => ({
          ...prev,
          isModified: true
        }));
      }
    }
  }, [items, globalDiscount, loadedDatabaseValues, originalLoadedItems]);

  // Handle initial data loading for editing quotes/orders
  useEffect(() => {
    if (initialData && initialData.data) {
      console.log("Loading initial data:", initialData);
      
      const data = initialData.data;
      
      // Debug: Log all available fields in the data
      console.log("Available fields in sales order/quote data:", Object.keys(data));
      console.log("Financial fields:", {
        discount_amount: data.discount_amount,
        global_discount: data.global_discount,
        total_discount: data.total_discount,
        discount_percentage: data.discount_percentage,
        total_amount: data.total_amount,
        final_amount: data.final_amount,
        subtotal: data.subtotal,
        freight_charges: data.freight_charges,
        tax_percentage: data.tax_percentage
      });
      
      try {
        // Populate customer data if available - check multiple sources
        let customerData: Record<string, unknown> | null = null;
        
        // Priority 1: Full customer details from API enhancement
        if (data.customer_details) {
          customerData = data.customer_details as Record<string, unknown>;
        }
        // Priority 2: Customer object directly
        else if (data.customer && typeof data.customer === 'object') {
          customerData = data.customer as Record<string, unknown>;
        }
        // Priority 3: Construct from customers relation and customer_id
        else if (data.customers && data.customer_id) {
          const customers = data.customers as Record<string, unknown>;
          customerData = {
            customer_id: data.customer_id,
            id: data.customer_id,
            name: String(customers.name || (typeof data.customer === 'string' ? data.customer : 'Unknown Customer')),
            ...customers
          };
        }
        // Priority 4: Minimal data from available fields
        else if (data.customer_id || data.customer) {
          customerData = {
            customer_id: data.customer_id || '',
            id: data.customer_id || '',
            name: typeof data.customer === 'string' ? String(data.customer) : 'Unknown Customer'
          };
        }
        
        if (customerData) {
          console.log("Setting customer data:", customerData);
          
          // Ensure all values are properly converted to strings and not objects
          const safeCustomerData = {
            customer_id: String(customerData.customer_id || customerData.id || ''),
            name: String(customerData.name || ''),
            phone: String(customerData.phone || ''),
            email: String(customerData.email || ''),
            address: String(customerData.address || ''),
            floor: String(customerData.floor || ''),
            city: String(customerData.city || ''),
            state: String(customerData.state || ''),
            pincode: String(customerData.pincode || ''),
            notes: String(customerData.notes || ''),
            tags: Array.isArray(customerData.tags) ? customerData.tags as string[] : [],
            latitude: typeof customerData.latitude === 'number' ? customerData.latitude : undefined,
            longitude: typeof customerData.longitude === 'number' ? customerData.longitude : undefined,
            formatted_address: String(customerData.formatted_address || ''),
            status: String(customerData.status || 'Lead'),
            source: String(customerData.source || 'billing_system')
          };
          
          console.log("Safe customer data:", safeCustomerData);
          setCustomer(safeCustomerData);
          
          // Also update the customer form fields so they show in the invoice section
          setCustomerForm({
            customer_id: safeCustomerData.customer_id,
            name: safeCustomerData.name,
            phone: safeCustomerData.phone,
            email: safeCustomerData.email,
            address: safeCustomerData.address,
            floor: safeCustomerData.floor,
            city: safeCustomerData.city,
            state: safeCustomerData.state,
            pincode: safeCustomerData.pincode,
            notes: safeCustomerData.notes,
            tags: safeCustomerData.tags,
            latitude: safeCustomerData.latitude,
            longitude: safeCustomerData.longitude,
            formatted_address: safeCustomerData.formatted_address,
            status: safeCustomerData.status,
            source: safeCustomerData.source
          });
          
          console.log("Customer form populated with address and contact info");
        }

        // Populate invoice details
        if (data.id) {
          setInvoiceNumber(String(data.id));
        }
        if (data.created_at) {
          const createdDate = new Date(String(data.created_at));
          // Use local date to avoid timezone shifts
          const year = createdDate.getFullYear();
          const month = String(createdDate.getMonth() + 1).padStart(2, '0');
          const day = String(createdDate.getDate()).padStart(2, '0');
          setInvoiceDate(`${year}-${month}-${day}`);
        }
        if (data.expected_delivery_date) {
          const deliveryDateValue = new Date(String(data.expected_delivery_date));
          // Use local date to avoid timezone shifts
          const year = deliveryDateValue.getFullYear();
          const month = String(deliveryDateValue.getMonth() + 1).padStart(2, '0');
          const day = String(deliveryDateValue.getDate()).padStart(2, '0');
          setDeliveryDate(`${year}-${month}-${day}`);
        }

        // Populate items if available
        if (Array.isArray(data.items)) {
          console.log("Raw sales order items from API:", data.items);
          
          const loadedItems: BillingItem[] = data.items.map((item: Record<string, unknown>, index: number) => {
            // Debug: Log all available fields
            console.log(`Item ${index} raw data:`, {
              name: item.name,
              unit_price: item.unit_price,
              final_price: item.final_price,
              quantity: item.quantity,
              sku: item.sku,
              products: item.products
            });
            
            // Use EXACT stored values from the database without any recalculation
            const quantity = Number(item.quantity || 1);
            
            // Debug the raw item data structure
            console.log(`Item ${index} - Raw item data structure:`, JSON.stringify(item, null, 2));
            
            // For originalPrice (Rate column), we need the ORIGINAL product price, not the discounted price
            // The final_price is the discounted price, so Rate should be higher than Selling Price
            let originalPrice = 0;
            
            // First try to get original price from products relation (master product price)
            if (item.products && typeof item.products === 'object') {
              const productsData = item.products as Record<string, unknown>;
              const productPrice = Number(productsData.price || 0);
              if (productPrice > 0) {
                originalPrice = productPrice;
                console.log(`Item ${index} - Using products.price as original rate: ${originalPrice}`);
              }
            }
            
            // If no product price, try unit_price but only if it's different from final_price
            if (originalPrice === 0 && item.unit_price) {
              const unitPrice = Number(item.unit_price);
              const finalPrice = Number(item.final_price || 0);
              
              // Only use unit_price if it's different from final_price (indicating there was a discount)
              if (unitPrice > 0 && unitPrice !== finalPrice) {
                originalPrice = unitPrice;
                console.log(`Item ${index} - Using unit_price as original rate (different from final): ${originalPrice}`);
              } else if (unitPrice > 0 && finalPrice === 0) {
                // If final_price is 0 but unit_price exists, use unit_price
                originalPrice = unitPrice;
                console.log(`Item ${index} - Using unit_price as original rate (final_price is 0): ${originalPrice}`);
              }
            }
            
            // If still 0, calculate original price from final_price + reasonable markup
            // This ensures Rate is always higher than Selling Price
            if (originalPrice === 0) {
              const finalPrice = Number(item.final_price || 0);
              if (finalPrice > 0) {
                // Add 15% markup to final price to get estimated original price
                originalPrice = Math.round(finalPrice * 1.15);
                console.log(`Item ${index} - Estimated original price from final_price + 15%: ${originalPrice}`);
              }
            }
            
            console.log(`Item ${index} - Final originalPrice for Rate column: ${originalPrice}`);
            
            // Handle final_price which might be line total or per-unit price
            const rawFinalPrice = Number(item.final_price || 0);
            const rawUnitPrice = Number(item.unit_price || 0);
            const taxableAmount = Number(item.taxable_amount || 0);
            
            // Priority 1: Use taxable_amount if available (actual discounted amount)
            let finalPrice = 0;
            if (taxableAmount > 0) {
              finalPrice = taxableAmount / quantity;
              console.log(`Item ${index} - using taxable_amount per unit: ₹${finalPrice.toFixed(2)} (${taxableAmount}/${quantity})`);
            }
            // Priority 2: Check if final_price is line total by comparing with unit_price * quantity
            else if (rawFinalPrice > 0) {
              // If final_price equals unit_price * quantity, it's a line total
              if (Math.abs(rawFinalPrice - (rawUnitPrice * quantity)) < 0.01) {
                // It's a line total, divide by quantity to get per-unit final price
                finalPrice = rawFinalPrice / quantity;
                console.log(`Item ${index} - final_price is line total, per-unit final price: ₹${finalPrice.toFixed(2)}`);
              } else {
                // It's already per-unit final price
                finalPrice = rawFinalPrice;
                console.log(`Item ${index} - final_price is per-unit: ₹${finalPrice.toFixed(2)}`);
              }
            } else {
              // Fallback to unit_price if final_price is not available
              finalPrice = rawUnitPrice || originalPrice || 0;
              console.log(`Item ${index} - using fallback price: ₹${finalPrice.toFixed(2)}`);
            }
            
            console.log(`Item ${index} - Unit Price (Rate): ₹${rawUnitPrice.toFixed(2)}, Final Price (Selling): ₹${finalPrice.toFixed(2)}`)
            
            const totalPrice = finalPrice * quantity; // Total line amount
            
            // Calculate discount using unit_price as base and final_price as discounted price
            const unitPriceForDiscount = rawUnitPrice > 0 ? rawUnitPrice : originalPrice;
            const discountPerUnit = unitPriceForDiscount - finalPrice;
            const discountPercentage = unitPriceForDiscount > 0 && discountPerUnit > 0
              ? (discountPerUnit / unitPriceForDiscount) * 100 
              : 0;
            
            const discountAmount = discountPerUnit * quantity;
            
            console.log(`Item ${index} - Discount calculation: Unit: ₹${unitPriceForDiscount.toFixed(2)}, Final: ₹${finalPrice.toFixed(2)}, Discount per unit: ₹${discountPerUnit.toFixed(2)}, Total discount: ₹${discountAmount.toFixed(2)}`);
            
            console.log(`Loading item ${index}: "${item.name}" - Unit Price (Rate): ₹${Number(item.unit_price || 0).toFixed(2)}, Final Price (Selling): ₹${finalPrice.toFixed(2)}, Qty: ${quantity}, Total: ₹${totalPrice.toFixed(2)}`);
            
            // Extract SKU properly from products relation
            let itemSku = '';
            if (item.products && typeof item.products === 'object') {
              const productsData = item.products as Record<string, unknown>;
              itemSku = String(productsData.sku || '');
            } else if (item.sku) {
              itemSku = String(item.sku);
            }
            
            // Reconstruct product data if it's not a custom product
            let productData: ProductWithInventory | undefined = undefined;
            if (item.product_id && item.name) {
              // Extract product details from the products relation
              const productsData = item.products as Record<string, unknown> | null;
              
              // Use cost from item first, then from products relation if item cost is 0
              const productCost = Number(item.cost) || Number(productsData?.cost) || 0;
              
              productData = {
                inventory_id: String(item.product_id),
                product_id: String(item.product_id),
                product_name: String(item.name),
                product_description: String(productsData?.description || ''),
                price: Number(productsData?.price || originalPrice), // Use product's original price
                cost: productCost,
                sku: itemSku,
                supplier_name: String(item.supplier_name || ''),
                supplier_id: String(item.supplier_id || ''),
                category: String(productsData?.category || 'General'),
                subcategory: String(item.subcategory || ''),
                material: String(item.material || ''),
                location: String(item.location || ''),
                quantity: 999, // Default inventory quantity for loaded items
                reorder_point: 10, // Default reorder point
                updated_at: new Date().toISOString(),
                product_created_at: String(item.created_at || ''),
                product_category: String(productsData?.category || 'General'),
                product_image_url: String(productsData?.image_url || ''),
                applied_margin: 0 // Default margin
              };
            }
            
            return {
              id: String(item.id || `item-${index}`),
              product: productData,
              customProduct: !item.product_id ? {
                id: String(item.custom_product_id || `custom-${index}`),
                name: String(item.name || ''),
                description: String(item.specifications || item.description || ''),
                price: originalPrice,
                cost: Number(item.cost) || Number((item.custom_products as Record<string, unknown>)?.cost_price) || 0,
                supplier_name: String(item.supplier_name || ''),
                config_schema: (item.configuration as Record<string, unknown>) || {} as Record<string, unknown>,
                lead_time_days: Number(item.estimated_delivery_days || 30)
              } : undefined,
              isCustom: !item.product_id,
              quantity: quantity,
              originalPrice: originalPrice, // Exact original price from DB
              finalPrice: finalPrice, // Exact final price from DB  
              totalPrice: totalPrice, // Calculated from final price * quantity
              discountAmount: discountAmount,
              discountPercentage: discountPercentage,
              tax: Number(item.tax || 0),
              return_status: (item.return_status as 'none' | 'partial' | 'full') || 'none',
              returned_quantity: Number(item.returned_quantity || 0)
            };
          });
          
          console.log("Loaded items with EXACT database values (no recalculation):", loadedItems.map(item => ({
            name: item.isCustom ? item.customProduct?.name : item.product?.product_name,
            sku: item.product?.sku || 'N/A',
            originalPrice: item.originalPrice,
            finalPrice: item.finalPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice
          })));
          
          setItems(loadedItems);
          
          // Store original items for modification detection
          setOriginalLoadedItems([...loadedItems]);
          
          // Set UI display values based on database values for existing sales orders
          // This ensures the UI shows correct values from the database when loading orders
          if (data.final_price !== undefined && data.discount_amount !== undefined) {
            console.log("Setting UI values from database:", {
              final_price: data.final_price,
              discount_amount: data.discount_amount,
              tax_percentage: data.tax_percentage,
              freight_charges: data.freight_charges
            });
            
            // Calculate item discounts from loaded items
            const itemDiscountTotal = loadedItems.reduce((sum: number, item: BillingItem) => sum + (item.discountAmount || 0), 0);
            
            // Calculate global discount: total discount - item discounts
            const totalDiscount = Number(data.discount_amount || 0);
            const calculatedGlobalDiscount = Math.max(0, totalDiscount - itemDiscountTotal);
            
            console.log("Discount breakdown from database:", {
              totalDiscountFromDB: totalDiscount,
              itemDiscountsCalculated: itemDiscountTotal,
              globalDiscountCalculated: calculatedGlobalDiscount
            });
            
            // Set the global discount to match what's stored in database
            setGlobalDiscount(calculatedGlobalDiscount);
            
            // Set database values for UI display
            setLoadedDatabaseValues({
              final_price: Number(data.final_price),
              discount_amount: Number(data.discount_amount),
              isLoaded: true,
              isModified: false
            });
            
            console.log(`✅ PREFILLED Global Discount Field: ₹${calculatedGlobalDiscount.toFixed(2)} (discount_amount: ₹${totalDiscount} - item_discounts: ₹${itemDiscountTotal})`);
            console.log("UI values set from database - Grand Total will show final_price, Total Discounts will show discount_amount");
          }
        }

        // Populate notes
        if (data.notes) {
          setNotes(String(data.notes));
        }

        // Populate tax percentage if available
        if (data.tax_percentage !== undefined) {
          setTaxPercentage(Number(data.tax_percentage));
        }

        // Populate freight charges if available
        if (data.freight_charges !== undefined) {
          console.log("Loading freight charges from quote/order:", data.freight_charges);
          setFreightCharges(Number(data.freight_charges));
        } else {
          console.log("No freight charges found in quote/order data");
        }

        // Note: Global discount will be calculated and set based on database values
        // in the section below where we process discount_amount and final_price

        // Populate salesman if available - check multiple sources
        let salesmanId: string | null = null;
        let salesmanName = 'Loading...';
        let salesmanEmail = '';
        
        // Get salesman ID from various fields
        if (data.sales_representative_id) {
          salesmanId = String(data.sales_representative_id);
        } else if (data.created_by) {
          salesmanId = String(data.created_by);
        }
        
        // Try to get salesman details from users relation
        if (salesmanId && data.users) {
          const users = data.users as Record<string, unknown>;
          salesmanName = String(users.name || 'Unknown User');
          salesmanEmail = String(users.email || '');
          console.log("Found salesman from users relation:", { salesmanId, salesmanName, salesmanEmail });
        }
        
        if (salesmanId) {
          // Try to find salesman in available list first
          if (availableSalespeople.length > 0) {
            const salesman = availableSalespeople.find(s => s.id === salesmanId || s.user_id === salesmanId);
            if (salesman) {
              setSelectedSalesman(salesman);
              console.log("Set salesman from available list:", salesman);
            } else {
              // Use data from API if not found in available list
              setSelectedSalesman({
                id: salesmanId,
                name: salesmanName,
                email: salesmanEmail,
                user_id: salesmanId
              });
              console.log("Set salesman from API data:", { id: salesmanId, name: salesmanName, email: salesmanEmail });
            }
          } else {
            // Set with API data that will be resolved when salespeople load
            setSelectedSalesman({
              id: salesmanId,
              name: salesmanName,
              email: salesmanEmail,
              user_id: salesmanId
            });
            console.log("Set placeholder salesman:", { id: salesmanId, name: salesmanName, email: salesmanEmail });
          }
        }

        console.log("Initial data loaded successfully");
        onDataLoaded?.();
        
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    }
  }, [initialData, availableSalespeople, onDataLoaded]);

  // Add product to items - Updated for proper BillingItem structure
  const addProductToItems = (productData: ProductWithInventory) => {
    const existingItemIndex = items.findIndex(item => 
      item.product?.product_id === productData.product_id
    );
    
    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].totalPrice = updatedItems[existingItemIndex].finalPrice * updatedItems[existingItemIndex].quantity;
      setItems(updatedItems);
    } else {
      const price = productData.price || 0;
      const newItem: BillingItem = {
        id: Date.now().toString(),
        product: productData,
        quantity: 1,
        originalPrice: price,
        finalPrice: price,
        totalPrice: price,
        discountAmount: 0,
        discountPercentage: 0,
        tax: price * (taxPercentage / 100),
        isCustom: false
      };
      setItems([...items, newItem]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update item quantity
  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(items.filter(item => item.id !== itemId));
    } else {
      setItems(items.map(item => {
        if (item.id === itemId) {
          const totalPrice = item.finalPrice * quantity;
          return { 
            ...item, 
            quantity, 
            totalPrice,
            tax: totalPrice * (taxPercentage / 100)
          };
        }
        return item;
      }));
    }
  };

  // Update item price
  const updateItemPrice = (itemId: string, price: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const finalPrice = Math.max(0, price);
        const totalPrice = finalPrice * item.quantity;
        return { 
          ...item, 
          finalPrice,
          totalPrice,
          tax: totalPrice * (taxPercentage / 100)
        };
      }
      return item;
    }));
  };



  // Update item discount percentage
  const updateItemDiscountPercentage = (itemId: string, discountPercentage: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const safeDiscountPercentage = Math.max(0, Math.min(100, discountPercentage));
        const discountAmount = item.originalPrice * (safeDiscountPercentage / 100);
        const finalPrice = item.originalPrice - discountAmount;
        const totalPrice = finalPrice * item.quantity;
        return { 
          ...item, 
          discountPercentage: safeDiscountPercentage,
          discountAmount: Math.round(discountAmount * 100) / 100,
          finalPrice: Math.round(finalPrice * 100) / 100,
          totalPrice: Math.round(totalPrice * 100) / 100,
          tax: totalPrice * (taxPercentage / 100)
        };
      }
      return item;
    }));
  };

  // Remove item
  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  // Create new customer
  const createNewCustomer = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customerForm.name,
          email: customerForm.email || null, // Use null for empty emails
          phone: customerForm.phone,
          address: customerForm.address,
          floor: customerForm.floor,
          city: customerForm.city,
          state: customerForm.state,
          pincode: customerForm.pincode,
          notes: customerForm.notes,
          status: customerForm.status || 'Lead',
          source: customerForm.source || 'billing_system',
          tags: customerForm.tags || [], // Purpose of visit and other tags
          created_by: selectedSalesman?.user_id || null // Use null instead of 'system'
        }),
      });

      if (response.ok) {
        const newCustomerData = await response.json();
        const newCustomer: BillingCustomer = {
          customer_id: newCustomerData[0]?.id || Date.now().toString(),
          id: newCustomerData[0]?.id,
          name: customerForm.name || '',
          email: customerForm.email,
          phone: customerForm.phone,
          address: customerForm.address,
          floor: customerForm.floor,
          city: customerForm.city,
          state: customerForm.state,
          pincode: customerForm.pincode,
          notes: customerForm.notes,
          tags: customerForm.tags,
          status: customerForm.status || 'Lead',
          source: customerForm.source || 'billing_system'
        };
        setCustomer(newCustomer);
        setShowCustomerForm(false);
        // Reset form
        setCustomerForm({
          customer_id: '',
          name: '',
          phone: '',
          email: '',
          address: '',
          floor: '',
          city: '',
          state: '',
          pincode: '',
          notes: '',
          tags: [],
          status: 'Lead',
          source: 'billing_system'
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to create customer:', response.status, errorText);
        alert(`Failed to create customer: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert(`Error creating customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Create custom product
  const createCustomProduct = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/products/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customProductForm,
          created_by: selectedSalesman?.user_id || 'system'
        }),
      });

      if (response.ok) {
        const customProduct: CustomProduct = await response.json();
        
        // Add the custom product to cart
        const newItem: BillingItem = {
          id: Date.now().toString(),
          customProduct: customProduct,
          quantity: 1,
          originalPrice: customProduct.price,
          finalPrice: customProduct.price,
          totalPrice: customProduct.price,
          discountAmount: 0,
          discountPercentage: 0,
          tax: customProduct.price * (taxPercentage / 100),
          isCustom: true
        };
        
        setItems(prev => [...prev, newItem]);
        setShowCustomProductForm(false);
        // Reset form
        setCustomProductForm({
          name: '',
          description: '',
          category: '',
          subcategory: '',
          price: 0,
          cost_price: null,
          material: '',
          lead_time_days: 30,
          supplier_id: '',
          supplier_name: ''
        });
      } else {
        console.error('Failed to create custom product');
      }
    } catch (error) {
      console.error('Error creating custom product:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Bajaj Finance handlers
  const handleBajajFinanceSetup = (financeData: BajajFinanceData) => {
    setBajajFinanceData(financeData);
    setShowBajajFinance(false);
    
    if (financeData.isSplitBill) {
      // Handle split bill scenario
      const emiPayment: PaymentMethod = {
        id: 'emi-' + Date.now(),
        type: 'emi',
        amount: financeData.splitBillBajajAmount || financeData.financeAmount,
        reference: `Split-EMI-${financeData.plan.months}M-${financeData.monthlyEMI}`
      };

      // Add the remaining amount as cash payment (can be changed to card/transfer)
      const remainingPayment: PaymentMethod = {
        id: 'remaining-' + Date.now(),
        type: 'cash', // Default to cash, user can change
        amount: financeData.splitBillOtherAmount || 0,
        reference: 'Split Bill - Cash Payment'
      };

      // Add down payment method if down payment exists
      const payments: PaymentMethod[] = [emiPayment, remainingPayment];
      if (financeData.downPayment > 0) {
        payments.push({
          id: 'down-payment-' + Date.now(),
          type: 'cash',
          amount: financeData.downPayment,
          reference: 'Down Payment'
        });
      }

      setPaymentMethods(payments);
    } else {
      // Regular Bajaj Finance (full amount)
      const emiPayment: PaymentMethod = {
        id: 'emi-' + Date.now(),
        type: 'emi',
        amount: financeData.financeAmount,
        reference: `EMI-${financeData.plan.months}M-${financeData.monthlyEMI}`
      };

      // Add down payment method if down payment exists
      const payments: PaymentMethod[] = [emiPayment];
      if (financeData.downPayment > 0) {
        payments.push({
          id: 'down-payment-' + Date.now(),
          type: 'cash',
          amount: financeData.downPayment,
          reference: 'Down Payment'
        });
      }

      setPaymentMethods(payments);
    }
  };

  const openBajajFinanceCalculator = () => {
    if (!customer) {
      alert('Please select a customer first');
      return;
    }
    setShowBajajFinance(true);
  };

  // Clear all data
  const clearAllData = () => {
    setCustomer(null);
    setItems([]);
    setNotes('');
    setPaymentMethods([]);
    setBajajFinanceData(null);
    setGlobalDiscount(0);
    setFreightCharges(0);
    setSelectedSalesman(null);
    setInvoiceNumber('');
    setDeliveryDate('');
  };

  return (
    <div className="h-full bg-white">
      {/* Print-friendly Invoice Layout */}
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        
        {/* Invoice Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">INVOICE</h1>
            <div className="mt-4 space-y-1">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-600" />
                <span className="font-medium">Invoice #: {invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span>Date: {new Date(invoiceDate).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <span>Delivery Date: {deliveryDate ? new Date(deliveryDate).toLocaleDateString() : 'Not set'}</span>
              </div>
            </div>
          </div>
          
          {/* Company Logo/Info */}
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">AL RAMS ERP</h2>
            <div className="mt-2 text-sm text-gray-600">
              <div>Professional Billing System</div>
              <div>www.alrams.com</div>
              <div>support@alrams.com</div>
            </div>
          </div>
        </div>

        {/* Control Panel - Only visible on screen, not print */}
        <div className="print:hidden bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Invoice Controls</h3>
            <div className="flex gap-2">
              <Button onClick={() => window.print()} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={clearAllData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button onClick={() => onSave?.(getCurrentBillingData())} variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>

          {/* Salesperson Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="salesperson-search">Salesperson *</Label>
              <div className="relative">
                <Input
                  id="salesperson-search"
                  value={salespersonSearchQuery || String(selectedSalesman?.name || '')}
                  onChange={(e) => {
                    setSalespersonSearchQuery(e.target.value);
                    searchSalespeople(e.target.value);
                    setShowSalespersonDropdown(true);
                    clearValidationErrors(); // Clear errors when user starts typing
                  }}
                  onFocus={() => {
                    setShowSalespersonDropdown(true);
                    if (!salespersonSearchQuery) {
                      setSalespersonSearchResults(availableSalespeople);
                    }
                  }}
                  placeholder="Search salesperson..."
                  className={`pr-8 ${!selectedSalesman ? 'border-red-300 focus:border-red-500' : ''}`}
                />
                {showSalespersonDropdown && salespersonSearchResults.length > 0 && (
                  <div className="salesperson-dropdown absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {salespersonSearchResults.map((person) => (
                      <div
                        key={person.id}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                        onClick={() => {
                          setSelectedSalesman(person);
                          setSalespersonSearchQuery(String(person.name || ''));
                          setShowSalespersonDropdown(false);
                        }}
                      >
                        <div className="font-medium">{String(person.name || '')}</div>
                        {person.email && (
                          <div className="text-sm text-gray-600">{String(person.email || '')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="invoice-date">Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="delivery-date">Delivery Date *</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => {
                  setDeliveryDate(e.target.value);
                  clearValidationErrors(); // Clear errors when user selects date
                }}
                className={!deliveryDate ? 'border-red-300 focus:border-red-500' : ''}
              />
            </div>
          </div>

          {/* Customer Search/Add */}
          <div className="mb-4">
            <Label>Customer</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Search customer by name, phone, or email..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    searchCustomers(e.target.value);
                  }}
                />
                {customerSearchResults.length > 0 && (
                  <div className="mt-2 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto z-50 absolute w-full">
                    {customerSearchResults.map((cust) => {
                      const custData = cust as BillingCustomer & {
                        displayAddress?: string;
                        previousOrdersCount?: number;
                        recentItems?: Array<{ name: string; quantity: number }>;
                      };
                      
                      return (
                        <div
                          key={cust.id}
                          className="p-3 hover:bg-gray-100 border-b last:border-b-0 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div 
                              className="flex-1 cursor-pointer"
                              onClick={() => {
                                setCustomer(cust);
                                setCustomerSearchQuery('');
                                setCustomerSearchResults([]);
                              }}
                            >
                              <div className="font-medium text-gray-900">{String(cust.name || '')}</div>
                              <div className="text-sm text-gray-600">
                                {String(cust.phone || '')} {cust.email && `• ${String(cust.email)}`}
                              </div>
                              {custData.displayAddress && (
                                <div className="text-xs text-gray-500 mt-1">
                                  📍 {custData.displayAddress}
                                </div>
                              )}
                              {custData.previousOrdersCount && custData.previousOrdersCount > 0 && (
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {custData.previousOrdersCount} previous {custData.previousOrdersCount === 1 ? 'order' : 'orders'}
                                  </span>
                                  {custData.recentItems && custData.recentItems.length > 0 && (
                                    <span className="text-xs text-gray-500">
                                      Recent: {custData.recentItems.map(item => item.name).slice(0, 2).join(', ')}
                                      {custData.recentItems.length > 2 && ` +${custData.recentItems.length - 2} more`}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCustomer(cust);
                              }}
                            >
                              <Edit className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button 
                onClick={() => setShowCustomerForm(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add New
              </Button>
            </div>
          </div>

          {/* Product Search/Add */}
          <div>
            <Label>Add Products</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchProducts(e.target.value);
                  }}
                />
                {isSearching && (
                  <div className="mt-2 text-sm text-gray-500">Searching...</div>
                )}
                {searchResults.length > 0 && (
                  <div className="mt-2 border rounded-md bg-white shadow-lg max-h-40 overflow-y-auto relative z-50">
                    {searchResults.map((product) => (
                      <div
                        key={product.product_id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        onClick={() => addProductToItems(product)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium flex-1">{String(product.product_name || '')}</div>
                          {product.supplier_name && (
                            <div className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded whitespace-nowrap">
                              {String(product.supplier_name)}
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">₹{String(product.price || 0)} • Stock: {String(product.quantity || 0)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button 
                onClick={() => setShowCustomProductForm(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Custom
              </Button>
            </div>
          </div>
        </div>

        {/* Bill To / Ship To Section */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-3">
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">BILL TO</h3>
            {customer ? (
              <div className="space-y-1">
                <div className="font-medium text-lg">{String(customer.name || '')}</div>
                {customer.full_name && customer.full_name !== customer.name && (
                  <div className="text-gray-600">{String(customer.full_name || '')}</div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  {String(customer.phone || '')}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    {String(customer.email || '')}
                  </div>
                )}
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 mt-1" />
                  <div>
                    {String(customer.address || '')}{customer.floor && `, ${String(customer.floor)}`}
                    <br />
                    {customer.city && `${String(customer.city)}, `}{String(customer.state || '')} {String(customer.pincode || '')}
                  </div>
                </div>
                {customer.gst_number && (
                  <div className="text-gray-600">
                    <strong>GST:</strong> {String(customer.gst_number || '')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 italic print:hidden">No customer selected</div>
            )}
          </div>

          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">INVOICE DETAILS</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Number:</span>
                <span className="font-medium">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Date:</span>
                <span>{new Date(invoiceDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Date:</span>
                <span>{deliveryDate ? new Date(deliveryDate).toLocaleDateString() : 'Not set'}</span>
              </div>
              {selectedSalesman && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Sales Rep:</span>
                  <span>{String(selectedSalesman.name || '')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table - Enhanced Styling */}
        <div className="overflow-x-auto min-w-full">
          <h3 className="text-lg font-semibold mb-4 border-b-2 border-gray-300 pb-2 text-gray-800">ITEMS</h3>
          
          {items.length > 0 ? (
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm min-w-[800px]">
              {/* Table Header */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 grid grid-cols-16 gap-1 p-3 font-semibold text-xs uppercase tracking-wide border-b-2 border-gray-300">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-4 px-2">Description</div>
                <div className="col-span-2 text-center">Cost</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-2 text-center">Selling Price</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-2 text-center">Discount</div>
                <div className="col-span-2 text-right pr-2">Final Rate</div>
              </div>
              
              {/* Table Rows */}
              {items.map((item, index) => {
                // Get the display name and description based on item type
                const displayName = item.isCustom 
                  ? item.customProduct?.name 
                  : item.product?.product_name;
                const displayDescription = item.isCustom 
                  ? item.customProduct?.description 
                  : item.product?.product_description;
                const productCost = item.isCustom 
                  ? item.customProduct?.cost || 0 
                  : item.product?.cost || 0;
                
                return (
                  <div key={item.id} className={`grid grid-cols-16 gap-1 p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                    
                    {/* Serial Number */}
                    <div className="col-span-1 text-center">
                      <div className="text-sm font-medium text-gray-700 bg-gray-100 rounded-full w-6 h-6 flex items-center justify-center mx-auto">
                        {index + 1}
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="col-span-4 px-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-gray-800 truncate" title={displayName}>
                          {displayName}
                        </span>
                        {/* Return/Exchange Status - Inline with product name */}
                        {item.return_status && item.return_status !== 'none' && (
                          <Badge 
                            variant={item.return_status === 'full' ? 'destructive' : 'secondary'}
                            className={`text-xs font-medium px-2 py-0.5 ${
                              item.return_status === 'full' 
                                ? 'bg-red-100 text-red-800 border-red-200' 
                                : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }`}
                          >
                            {item.return_status === 'full' ? 'Fully Returned' : 
                             `Partially Returned`}
                          </Badge>
                        )}
                      </div>
                      {displayDescription && (
                        <div className="text-xs text-gray-500 mt-1 truncate" title={displayDescription}>
                          {displayDescription}
                        </div>
                      )}
                      <div className="print:hidden mt-2 flex gap-1">
                        {/* Delete Button */}
                        <Button
                          onClick={() => removeItem(item.id)}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0 border-red-200 hover:border-red-300 hover:bg-red-50"
                          title="Delete Item"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Cost */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm text-gray-600 font-medium bg-gray-50 rounded px-2 py-1">
                        ₹{productCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    {/* Rate (Original Price) */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm font-medium text-gray-800 bg-blue-50 rounded px-2 py-1">
                        ₹{item.originalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    {/* Selling Price (Final Price per unit) */}
                    <div className="col-span-2 text-center">
                      <div className="print:hidden">
                        <Input
                          type="number"
                          value={item.finalPrice}
                          onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                          className="w-full h-8 text-sm border-gray-300 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-200 text-center font-semibold"
                          min="0"
                          step="0.01"
                          placeholder="Selling Price"
                        />
                      </div>
                      <div className="print:block hidden text-sm font-semibold text-gray-800">
                        ₹{item.finalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    
                    {/* Quantity */}
                    <div className="col-span-1 text-center">
                      <div className="print:hidden">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                          className="w-full h-8 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-center font-semibold"
                          min="1"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="print:block hidden text-sm font-semibold text-gray-800">
                        {item.quantity}
                      </div>
                    </div>
                    
                    {/* Discount */}
                    <div className="col-span-2 text-center">
                      <div className="print:hidden">
                        <Input
                          type="number"
                          value={item.discountAmount}
                          onChange={(e) => {
                            const discountAmount = Number(e.target.value);
                            const discountPercentage = item.originalPrice > 0 ? (discountAmount / item.originalPrice) * 100 : 0;
                            updateItemDiscountPercentage(item.id, discountPercentage);
                          }}
                          className="w-full h-8 text-sm border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-200 text-center"
                          min="0"
                          step="1"
                          placeholder="₹"
                        />
                      </div>
                      <div className="print:block hidden text-sm text-green-700 font-medium">
                        ₹{item.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    
                    {/* Final Rate (Selling Price × Quantity) */}
                    <div className="col-span-2 text-right pr-2">
                      <div className="text-sm font-bold text-gray-900 bg-green-50 border border-green-200 rounded px-3 py-1 inline-block">
                        ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ₹{item.finalPrice.toFixed(2)} × {item.quantity} = ₹{(item.finalPrice * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 italic py-12 print:hidden border border-gray-300 rounded-lg bg-gray-50">
              <div className="text-lg mb-2">📋</div>
              <div>No items added yet</div>
              <div className="text-sm mt-1">Add products to start building your invoice</div>
            </div>
          )}
        </div>

        {/* Totals Section - Enhanced */}
        <div className="flex justify-end">
          <div className="w-full md:w-1/2">
            <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-4 font-semibold border-b border-gray-300 text-gray-800 uppercase tracking-wide">
                Invoice Summary
              </div>
              <div className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700 font-medium">Original Total:</span>
                  <span className="font-semibold text-gray-900">₹{originalTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                {/* Item Discounts (individual product discounts) */}
                {itemDiscountAmount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-green-700 font-medium">
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Item Discounts ({((itemDiscountAmount / originalTotal) * 100).toFixed(1)}%):
                      </span>
                    </span>
                    <span className="font-semibold text-green-700">-₹{itemDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                
                {/* Global Discount (separate line item) */}
                {globalDiscount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-blue-700 font-medium">
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Global Discount:
                      </span>
                    </span>
                    <span className="font-semibold text-blue-700">-₹{globalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                
                {/* Total Discounts Summary */}
                {displayTotalDiscountAmount > 0 && (
                  <div className="flex justify-between items-center py-1 bg-green-50 px-3 rounded border-l-4 border-green-400">
                    <span className="text-green-700 font-medium text-sm">
                      Total Discounts ({((displayTotalDiscountAmount / originalTotal) * 100).toFixed(1)}%):
                    </span>
                    <span className="font-semibold text-green-700 text-sm">-₹{displayTotalDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2 bg-yellow-50 px-3 rounded border-l-4 border-yellow-400">
                  <span className="font-semibold text-gray-800">Subtotal:</span>
                  <span className="font-bold text-gray-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700 font-medium">
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      Tax ({taxPercentage}%):
                    </span>
                  </span>
                  <span className="font-semibold text-orange-700">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                
                {freightCharges > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700 font-medium">
                      <span className="inline-flex items-center">
                        <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                        Freight Charges:
                      </span>
                    </span>
                    <span className="font-semibold text-purple-700">₹{freightCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-gray-300 pt-3 mt-4">
                  <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 rounded-lg border border-green-200">
                    <span className="font-bold text-lg text-gray-800 uppercase tracking-wide">Grand Total:</span>
                    <span className="font-bold text-xl text-green-800">₹{displayGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Discount and Freight Controls - Only visible on screen */}
              <div className="print:hidden px-4 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 space-y-4">
                <h5 className="font-medium text-gray-800 text-sm uppercase tracking-wide">Quick Controls</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Global Discount
                    </Label>
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                      <Input
                        type="number"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                        className="h-9 text-sm border-0 focus:ring-0 rounded-none"
                        min="0"
                        placeholder="0"
                      />
                      <div className="w-16 h-9 text-xs border-0 border-l border-gray-300 rounded-none bg-gray-50 flex items-center justify-center font-medium">
                        ₹
                      </div>
                    </div>
                    {/* Global discount status indicator */}
                    {globalDiscount > 0 && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        ✓ Global discount distributed to all items
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      Tax Percentage
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={taxPercentage}
                        onChange={(e) => setTaxPercentage(Number(e.target.value))}
                        className="h-9 text-sm border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 pr-8"
                        min="0"
                        max="100"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Delivery Floor
                    </Label>
                    <Select value={deliveryFloor} onValueChange={(value) => {
                      setDeliveryFloor(value);
                      // Set awareness flag for 1st floor
                      if (value === 'first') {
                        setIsFirstFloorAwareness(true); // Mark awareness needed for 1st floor
                      } else {
                        setIsFirstFloorAwareness(false);
                      }
                      // Note: Freight charges can be manually entered below
                    }}>
                      <SelectTrigger className="h-9 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200">
                        <SelectValue placeholder="Select floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ground">Ground Floor</SelectItem>
                        <SelectItem value="first">1st Floor</SelectItem>
                        <SelectItem value="second">2nd Floor</SelectItem>
                        <SelectItem value="third">3rd Floor</SelectItem>
                        <SelectItem value="higher">Higher Floor</SelectItem>
                      </SelectContent>
                    </Select>
                    {isFirstFloorAwareness && (
                      <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                        ⚠️ 1st Floor Delivery: Prepare tools for reassembly
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Freight Charges
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                      <Input
                        type="number"
                        value={freightCharges}
                        onChange={(e) => setFreightCharges(Number(e.target.value))}
                        className="h-9 text-sm border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-200 pl-8"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods Section - Only visible on screen */}
        <div className="print:hidden">
          <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">PAYMENT OPTIONS</h3>
          
          <div className="space-y-4">
            {/* Payment Method Buttons - Only Bajaj Finance */}
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openBajajFinanceCalculator}
                className="flex flex-col h-16 bg-blue-50 border-blue-200 hover:bg-blue-100"
              >
                <span className="text-xs font-medium text-blue-700">Bajaj EMI</span>
                <span className="text-xs text-blue-600">Split Payment</span>
              </Button>
            </div>

            {/* Current Payment Methods Display */}
            {paymentMethods.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">
                  Selected Payment Methods:
                  {bajajFinanceData?.isSplitBill && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Split Bill
                    </span>
                  )}
                </h4>
                {paymentMethods.map((payment, index) => (
                  <div key={payment.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{payment.type}</span>
                      {payment.reference && (
                        <span className="text-xs text-gray-600">({payment.reference})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">₹{payment.amount.toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newPayments = paymentMethods.filter((_, i) => i !== index);
                          setPaymentMethods(newPayments);
                          if (payment.type === 'emi') {
                            setBajajFinanceData(null);
                          }
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bajaj Finance Details Display */}
            {bajajFinanceData && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-sm text-blue-800 mb-2">Bajaj Finance EMI Details</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Order Amount:</span>
                    <span className="font-medium ml-2">₹{bajajFinanceData.orderAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Down Payment:</span>
                    <span className="font-medium ml-2">₹{bajajFinanceData.downPayment.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Finance Amount:</span>
                    <span className="font-medium ml-2">₹{bajajFinanceData.financeAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly EMI:</span>
                    <span className="font-medium ml-2">₹{bajajFinanceData.monthlyEMI.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tenure:</span>
                    <span className="font-medium ml-2">{bajajFinanceData.plan.months} months</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Interest Rate:</span>
                    <span className="font-medium ml-2">{bajajFinanceData.plan.interestRate}% p.a.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes Section */}
        {(notes || !notes) && (
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">NOTES</h3>
            <div className="print:hidden">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes or terms & conditions..."
                rows={3}
                className="mb-2"
              />
            </div>
            {notes && (
              <div className="text-sm text-gray-700 p-3 bg-gray-50 border border-gray-200">
                {notes}
              </div>
            )}
          </div>
        )}

        {/* Quote Status Indicator - Only visible on screen */}
        {quoteGenerated && (
          <div className="print:hidden flex justify-center pt-4">
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              quoteStatus === 'Converted' || quoteStatus === 'converted'
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              Quote Status: {(quoteStatus === 'Converted' || quoteStatus === 'converted') ? 'Converted to Sales Order' : 'Draft'}
            </div>
          </div>
        )}

        {/* Action Buttons - Only visible on screen */}
        <div className="print:hidden flex justify-center gap-4 pt-6 border-t border-gray-200">
          <Button 
            onClick={() => {
              // Validation before creating quote/order
              const errors: string[] = [];
              if (!selectedSalesman) {
                errors.push('Please select a salesperson');
              }
              if (!deliveryDate) {
                errors.push('Please select a delivery date');
              }
              
              if (errors.length > 0) {
                setValidationErrors(errors);
                return;
              }
              
              // Clear errors and proceed
              setValidationErrors([]);
              onCreateQuoteAndSalesOrder?.(getCurrentBillingData());
            }}
            disabled={(() => {
              const isCustomerMissing = !customer;
              const isProcessingActive = isProcessing;
              const isExternalProcessingActive = externalIsProcessing;
              const isSalesmanMissing = !selectedSalesman;
              const isDeliveryDateMissing = !deliveryDate;
              const isItemsInvalid = items.length === 0 && !(initialData?.isEditing === true && initialData?.type === 'order');
              
              const isDisabled = isCustomerMissing || isProcessingActive || isExternalProcessingActive || 
                               isSalesmanMissing || isDeliveryDateMissing || isItemsInvalid;
              
              if (isDisabled) {
                console.log("Update Sales Order button disabled due to:", {
                  isCustomerMissing,
                  isProcessingActive,
                  isExternalProcessingActive,
                  isSalesmanMissing,
                  isDeliveryDateMissing,
                  isItemsInvalid,
                  customer: customer?.name || 'None',
                  selectedSalesman: selectedSalesman?.name || 'None',
                  deliveryDate: deliveryDate || 'None',
                  itemsCount: items.length
                });
              }
              
              return isDisabled;
            })()}
            variant="outline"
            title={initialData?.isEditing && initialData?.type === 'order' && items.length === 0 
              ? "Update Sales Order - Allowed with 0 items for returns processing" 
              : undefined
            }
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {initialData?.isEditing 
              ? (initialData.type === 'quote' 
                ? 'Update Quote & Create Order' 
                : 'Update Sales Order'
              )
              : 'Create Quote & Sales Order'
            }
          </Button>
          
          <Button 
            onClick={() => {
              // Create mock invoice data and open payment tracker
              const billingData = getCurrentBillingData();
              const mockInvoice: Invoice = {
                id: `INV-${Date.now()}`,
                invoice_number: `INV-${Date.now()}`,
                sales_order_id: `SO-${Date.now()}`,
                customer_id: billingData.customer?.customer_id || billingData.customer?.id || '',
                customer_name: billingData.customer?.name || '',
                amount: billingData.finalTotal,
                total: billingData.finalTotal,
                paid_amount: 0,
                status: 'draft',
                created_at: new Date().toISOString(),
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
              };
              setGeneratedInvoice(mockInvoice);
              setShowPaymentTracker(true);
            }}
            disabled={!customer || items.length === 0 || isProcessing || externalIsProcessing}
          >
            <Send className="h-4 w-4 mr-2" />
            Generate Invoice
          </Button>

          <Button 
            onClick={() => setCreateInvoiceOpen(true)}
            variant="outline"
            className="bg-white border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="print:hidden bg-red-50 border border-red-200 rounded-md p-3 mx-auto max-w-md">
            <div className="text-red-800 text-sm">
              <div className="font-medium mb-1">Please fix the following issues:</div>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Customer Form Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add New Customer
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomerForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer-name">Name *</Label>
                  <Input
                    id="customer-name"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-phone">Phone</Label>
                  <Input
                    id="customer-phone"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-source">Source</Label>
                  <Select 
                    value={customerForm.source || 'billing_system'} 
                    onValueChange={(value) => setCustomerForm({...customerForm, source: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="billing_system">Billing System</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="Walk-in">Walk-in</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="customer-tags">Purpose of Visit</Label>
                <Select 
                  value={customerForm.tags?.[0] || ''} 
                  onValueChange={(value) => setCustomerForm({...customerForm, tags: value ? [value] : []})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose of visit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Product Inquiry">Product Inquiry</SelectItem>
                    <SelectItem value="Price Quote">Price Quote</SelectItem>
                    <SelectItem value="Purchase">Purchase</SelectItem>
                    <SelectItem value="Custom Order">Custom Order</SelectItem>
                    <SelectItem value="After Sales Support">After Sales Support</SelectItem>
                    <SelectItem value="Warranty Claim">Warranty Claim</SelectItem>
                    <SelectItem value="Bulk Order">Bulk Order</SelectItem>
                    <SelectItem value="Interior Design Consultation">Interior Design Consultation</SelectItem>
                    <SelectItem value="Catalog Browsing">Catalog Browsing</SelectItem>
                    <SelectItem value="Delivery Query">Delivery Query</SelectItem>
                    <SelectItem value="Payment Query">Payment Query</SelectItem>
                    <SelectItem value="Complaint">Complaint</SelectItem>
                    <SelectItem value="Feedback">Feedback</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Exchange/Return">Exchange/Return</SelectItem>
                    <SelectItem value="Installation Service">Installation Service</SelectItem>
                    <SelectItem value="Maintenance Service">Maintenance Service</SelectItem>
                    <SelectItem value="Corporate Inquiry">Corporate Inquiry</SelectItem>
                    <SelectItem value="Showroom Visit">Showroom Visit</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="customer-address">Address * 
                  <span className="text-xs text-gray-500 ml-2">(Auto-geocoded for accurate location)</span>
                </Label>
                <Input
                  id="customer-address"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                  placeholder="Street address"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer-floor">Floor/Unit *</Label>
                  <Input
                    id="customer-floor"
                    value={customerForm.floor}
                    onChange={(e) => setCustomerForm({...customerForm, floor: e.target.value})}
                    placeholder="Floor/Unit number"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-city">City</Label>
                  <Input
                    id="customer-city"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm({...customerForm, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="customer-state">State</Label>
                  <Input
                    id="customer-state"
                    value={customerForm.state}
                    onChange={(e) => setCustomerForm({...customerForm, state: e.target.value})}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-pincode">Pincode</Label>
                  <Input
                    id="customer-pincode"
                    value={customerForm.pincode}
                    onChange={(e) => setCustomerForm({...customerForm, pincode: e.target.value})}
                    placeholder="Pincode"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-status">Status</Label>
                  <Select 
                    value={customerForm.status || 'Lead'} 
                    onValueChange={(value) => setCustomerForm({...customerForm, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Churned">Churned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="customer-notes">Notes</Label>
                <Textarea
                  id="customer-notes"
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({...customerForm, notes: e.target.value})}
                  placeholder="Additional notes about the customer"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomerForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createNewCustomer}
                  disabled={!customerForm.name || !customerForm.phone || !customerForm.address || !customerForm.floor || isProcessing}
                >
                  {isProcessing ? 'Creating...' : 'Add Customer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Product Form Modal */}
      {showCustomProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Add Custom Product
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomProductForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="custom-name">Product Name *</Label>
                <Input
                  id="custom-name"
                  value={customProductForm.name}
                  onChange={(e) => setCustomProductForm({...customProductForm, name: e.target.value})}
                  placeholder="Product name"
                />
              </div>
              
              <div>
                <Label htmlFor="custom-description">Description</Label>
                <Textarea
                  id="custom-description"
                  value={customProductForm.description}
                  onChange={(e) => setCustomProductForm({...customProductForm, description: e.target.value})}
                  placeholder="Product description"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                                 <div>
                  <Label htmlFor="custom-cost-price">
                    Cost Price 
                    <span className="text-sm text-gray-500 ml-1">
                      (Optional - auto-calculated if blank)
                    </span>
                  </Label>
                  <Input
                    id="custom-cost-price"
                    type="number"
                    value={customProductForm.cost_price || ''}
                    onChange={(e) => setCustomProductForm({
                      ...customProductForm, 
                      cost_price: e.target.value ? Number(e.target.value) : null
                    })}
                    placeholder={customProductForm.price > 0 ? `Auto: ${(customProductForm.price * 0.70).toFixed(2)}` : "0.00"}
                    min="0"
                    step="0.01"
                  />
                  {customProductForm.price > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      {customProductForm.cost_price ? (
                        <span className="font-medium">
                          Margin: {(((customProductForm.price - customProductForm.cost_price) / customProductForm.price) * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span>Default margin: 30% (Cost: ₹{(customProductForm.price * 0.70).toFixed(2)})</span>
                      )}
                    </div>
                  )}
                </div>
                  <Label htmlFor="custom-price">Selling Price (MRP) *</Label>
                  <Input
                    id="custom-price"
                    type="number"
                    value={customProductForm.price}
                    onChange={(e) => setCustomProductForm({...customProductForm, price: Number(e.target.value)})}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* <div>
                  <Label htmlFor="custom-category">Category</Label>
                  <Input
                    id="custom-category"
                    value={customProductForm.category}
                    onChange={(e) => setCustomProductForm({...customProductForm, category: e.target.value})}
                    placeholder="Category"
                  />
                </div> */}
                {/* <div>
                  <Label htmlFor="custom-subcategory">Subcategory</Label>
                  <Input
                    id="custom-subcategory"
                    value={customProductForm.subcategory}
                    onChange={(e) => setCustomProductForm({...customProductForm, subcategory: e.target.value})}
                    placeholder="Subcategory"
                  />
                </div> */}
              </div>
                <div>
                  <Label htmlFor="custom-material">Material</Label>
                  <Input
                    id="custom-material"
                    value={customProductForm.material}
                    onChange={(e) => setCustomProductForm({...customProductForm, material: e.target.value})}
                    placeholder="Material"
                  />
                </div>
                {/* <div>
                  <Label htmlFor="custom-subcategory">Subcategory</Label>
                  <Input
                    id="custom-subcategory"
                    value={customProductForm.subcategory}
                    onChange={(e) => setCustomProductForm({...customProductForm, subcategory: e.target.value})}
                    placeholder="Subcategory"
                  />
                </div> */}
              

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custom-lead-time">Lead Time (Days)</Label>
                  <Input
                    id="custom-lead-time"
                    type="number"
                    value={customProductForm.lead_time_days}
                    onChange={(e) => setCustomProductForm({...customProductForm, lead_time_days: Number(e.target.value)})}
                    placeholder="30"
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-sku">SKU</Label>
                  <Input
                    id="custom-sku"
                    value={customProductForm.sku}
                    onChange={(e) => setCustomProductForm({...customProductForm, sku: e.target.value})}
                    placeholder="Product SKU"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="custom-supplier">Supplier *</Label>
                <div className="relative">
                  <Input
                    id="custom-supplier"
                    value={supplierSearchQuery || customProductForm.supplier_name || ''}
                    onChange={(e) => {
                      setSupplierSearchQuery(e.target.value);
                      searchSuppliers(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => {
                      setShowSupplierDropdown(true);
                      if (!supplierSearchQuery) {
                        setSupplierSearchResults(availableSuppliers);
                      }
                    }}
                    placeholder="Search suppliers..."
                    className="pr-8"
                  />
                  {showSupplierDropdown && supplierSearchResults.length > 0 && (
                    <div className="supplier-dropdown absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {supplierSearchResults.map((supplier) => (
                        <div
                          key={supplier.id}
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                          onClick={() => {
                            setCustomProductForm({
                              ...customProductForm, 
                              supplier_id: supplier.id,
                              supplier_name: supplier.name
                            });
                            setSupplierSearchQuery(supplier.name);
                            setShowSupplierDropdown(false);
                          }}
                        >
                          <div className="font-medium">{supplier.name}</div>
                          {supplier.contact && (
                            <div className="text-sm text-gray-600">{supplier.contact}</div>
                          )}
                          {supplier.email && (
                            <div className="text-sm text-gray-500">{supplier.email}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomProductForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createCustomProduct}
                  disabled={!customProductForm.name || customProductForm.price <= 0 || !customProductForm.supplier_id || isProcessing}
                >
                  {isProcessing ? 'Creating...' : 'Add Product'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bajaj Finance Calculator Modal */}
      <BajajFinanceCalculator
        isOpen={showBajajFinance}
        orderAmount={displayGrandTotal}
        customerId={customer?.customer_id || customer?.id || ''}
        onClose={() => setShowBajajFinance(false)}
        onSelect={handleBajajFinanceSetup}
      />

      {/* Payment Tracking Dialog */}
      {generatedInvoice && (
        <PaymentTrackingDialog
          open={showPaymentTracker}
          onOpenChange={(open) => {
            setShowPaymentTracker(open);
            if (!open) {
              setGeneratedInvoice(null);
            }
          }}
          invoice={generatedInvoice}
          onSuccess={() => {
            setShowPaymentTracker(false);
            setGeneratedInvoice(null);
          }}
        />
      )}

      {/* Edit Customer Dialog */}
      <Dialog open={editCustomerModalOpen} onOpenChange={setEditCustomerModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Edit className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Edit Customer
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  Update customer information
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="pt-2">
            <CustomerForm
              initialData={selectedCustomerForEdit || undefined}
              onSubmit={handleSaveEditedCustomer}
              onCancel={() => {
                setEditCustomerModalOpen(false);
                setSelectedCustomerForEdit(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Create New Invoice
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Create a standalone invoice for tracking old sales orders and receivables
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Customer Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="customer_name" className="text-sm font-medium">
                    Customer Name *
                  </Label>
                  <Input
                    id="customer_name"
                    placeholder="Start typing customer name..."
                    value={invoiceForm.customer_name}
                    onChange={(e) => {
                      setInvoiceForm({ ...invoiceForm, customer_name: e.target.value });
                      if (!showInvoiceCustomerDropdown) {
                        setShowInvoiceCustomerDropdown(true);
                      }
                    }}
                    onFocus={() => setShowInvoiceCustomerDropdown(true)}
                    onBlur={() => {
                      setTimeout(() => setShowInvoiceCustomerDropdown(false), 300);
                    }}
                    className="w-full"
                  />
                  {/* Enhanced dropdown with customer suggestions */}
                  {showInvoiceCustomerDropdown && (
                    <div 
                      className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 min-h-[60px] overflow-y-auto z-[9999] mt-1"
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {(() => {
                        const searchTerm = invoiceForm.customer_name.toLowerCase().trim();
                        const filteredCustomers = customerSearchResults.filter(cust => {
                          if (!searchTerm) return true;
                          const nameMatch = cust.name.toLowerCase().includes(searchTerm);
                          const phoneMatch = cust.phone && cust.phone.includes(searchTerm);
                          const emailMatch = cust.email && cust.email.toLowerCase().includes(searchTerm);
                          return nameMatch || phoneMatch || emailMatch;
                        });

                        if (filteredCustomers.length === 0) {
                          return (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {searchTerm 
                                ? `No customers match "${invoiceForm.customer_name}". You can create a new customer.`
                                : "Start typing to search customers..."
                              }
                            </div>
                          );
                        }

                        return filteredCustomers.slice(0, 10).map((cust, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => handleInvoiceCustomerSelect(cust)}
                          >
                            <div className="font-medium text-sm text-gray-900">{cust.name}</div>
                            {(cust.phone || cust.email) && (
                              <div className="text-xs text-gray-500 mt-1">
                                {cust.phone && <span>📞 {cust.phone}</span>}
                                {cust.phone && cust.email && <span> • </span>}
                                {cust.email && <span>✉️ {cust.email}</span>}
                              </div>
                            )}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Start typing to see existing customers or enter a new customer name
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer_phone" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="customer_phone"
                    placeholder="Enter phone number"
                    value={invoiceForm.customer_phone}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_phone: e.target.value })}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customer_email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="customer_email"
                    type="email"
                    placeholder="Enter email address"
                    value={invoiceForm.customer_email}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_email: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Invoice Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_date" className="text-sm font-medium">
                    Invoice Date *
                  </Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoice_amount" className="text-sm font-medium">
                    Amount (₹) *
                  </Label>
                  <Input
                    id="invoice_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    className="w-full text-lg"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="invoice_description" className="text-sm font-medium">
                    Description *
                  </Label>
                  <Input
                    id="invoice_description"
                    placeholder="Enter invoice description"
                    value={invoiceForm.description}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="invoice_notes" className="text-sm font-medium">
                    Notes
                  </Label>
                  <Textarea
                    id="invoice_notes"
                    placeholder="Additional notes (optional)"
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    className="w-full min-h-20"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <Button
              variant="outline"
              type="button"
              onClick={() => setCreateInvoiceOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              type="button" 
              onClick={handleCreateInvoice}
              disabled={!invoiceForm.customer_name || !invoiceForm.amount || !invoiceForm.description || isCreatingInvoice}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto order-1 sm:order-2"
            >
              {isCreatingInvoice ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Create Invoice
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
