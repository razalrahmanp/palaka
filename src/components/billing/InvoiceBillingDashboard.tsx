"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Save
} from "lucide-react";
import { ProductWithInventory, BillingCustomer, BillingItem, CustomProduct, PaymentMethod, BillingData, Invoice } from "@/types";
import { BajajFinanceCalculator, BajajFinanceData } from './BajajFinanceCalculator';
import { PaymentTrackingDialog } from '../finance/PaymentTrackingDialog';

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
}

export function InvoiceBillingDashboard({
  onSave,
  onCreateQuoteAndSalesOrder,
  isProcessing: externalIsProcessing = false,
  quoteGenerated = false,
  quoteStatus = ''
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
  
  // Custom Product States
  const [showCustomProductForm, setShowCustomProductForm] = useState(false);
  const [customProductForm, setCustomProductForm] = useState<CustomProduct>({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    price: 0,
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
  const [globalDiscountType, setGlobalDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [taxPercentage, setTaxPercentage] = useState(18);
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

  // Calculations - Updated to use proper BillingItem structure with rounding
  const subtotal = Math.round((items.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0)) * 100) / 100;
  const originalTotal = Math.round((items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0)) * 100) / 100;
  const itemDiscountAmount = Math.round((originalTotal - subtotal) * 100) / 100; // Individual item discounts
  const globalDiscountAmount = globalDiscountType === 'percentage' 
    ? Math.round((subtotal * globalDiscount / 100) * 100) / 100
    : globalDiscount;
  const totalDiscountAmount = Math.round((itemDiscountAmount + globalDiscountAmount) * 100) / 100;
  const taxableAmount = Math.round((subtotal - globalDiscountAmount) * 100) / 100;
  const taxAmount = Math.round((taxableAmount * taxPercentage / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount + freightCharges) * 100) / 100;

  // Helper function to get current billing data
  const getCurrentBillingData = (): BillingData => ({
    customer,
    items,
    paymentMethods,
    finalTotal: grandTotal,
    notes,
    deliveryDate,
    deliveryFloor, // Include floor selection
    isFirstFloorAwareness, // Include awareness flag
    selectedSalesman,
    totals: {
      original_price: originalTotal,
      total_price: subtotal,
      final_price: grandTotal, // This is what customer actually pays
      discount_amount: totalDiscountAmount,
      subtotal: taxableAmount,
      tax: taxAmount,
      freight_charges: freightCharges,
      grandTotal
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
          name: emp.name,
          email: emp.email,
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

  // Update item original price
  const updateItemOriginalPrice = (itemId: string, originalPrice: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const safeOriginalPrice = Math.max(0, originalPrice);
        // Recalculate discount amount and final price
        const discountAmount = safeOriginalPrice * (item.discountPercentage / 100);
        const finalPrice = safeOriginalPrice - discountAmount;
        const totalPrice = finalPrice * item.quantity;
        return { 
          ...item, 
          originalPrice: safeOriginalPrice,
          discountAmount: Math.round(discountAmount * 100) / 100,
          finalPrice: Math.round(finalPrice * 100) / 100,
          totalPrice: Math.round(totalPrice * 100) / 100,
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
    <div className="min-h-screen bg-white">
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
                  value={salespersonSearchQuery || selectedSalesman?.name || ''}
                  onChange={(e) => {
                    setSalespersonSearchQuery(e.target.value);
                    searchSalespeople(e.target.value);
                    setShowSalespersonDropdown(true);
                  }}
                  onFocus={() => {
                    setShowSalespersonDropdown(true);
                    if (!salespersonSearchQuery) {
                      setSalespersonSearchResults(availableSalespeople);
                    }
                  }}
                  placeholder="Search salesperson..."
                  className="pr-8"
                />
                {showSalespersonDropdown && salespersonSearchResults.length > 0 && (
                  <div className="salesperson-dropdown absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {salespersonSearchResults.map((person) => (
                      <div
                        key={person.id}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-100 border-b last:border-b-0"
                        onClick={() => {
                          setSelectedSalesman(person);
                          setSalespersonSearchQuery(person.name);
                          setShowSalespersonDropdown(false);
                        }}
                      >
                        <div className="font-medium">{person.name}</div>
                        {person.email && (
                          <div className="text-sm text-gray-600">{person.email}</div>
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
              <Label htmlFor="delivery-date">Delivery Date</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>

          {/* Customer Search/Add */}
          <div className="mb-4">
            <Label>Customer</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search customer by name, phone, or email..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    searchCustomers(e.target.value);
                  }}
                />
                {customerSearchResults.length > 0 && (
                  <div className="mt-2 border rounded-md bg-white shadow-lg max-h-40 overflow-y-auto">
                    {customerSearchResults.map((cust) => (
                      <div
                        key={cust.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          setCustomer(cust);
                          setCustomerSearchQuery('');
                          setCustomerSearchResults([]);
                        }}
                      >
                        <div className="font-medium">{cust.name}</div>
                        <div className="text-sm text-gray-600">{cust.phone} • {cust.email}</div>
                      </div>
                    ))}
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
                  <div className="mt-2 border rounded-md bg-white shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map((product) => (
                      <div
                        key={product.product_id}
                        className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                        onClick={() => addProductToItems(product)}
                      >
                        <div className="font-medium">{product.product_name}</div>
                        <div className="text-sm text-gray-600">₹{product.price} • Stock: {product.quantity || 0}</div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">BILL TO</h3>
            {customer ? (
              <div className="space-y-1">
                <div className="font-medium text-lg">{customer.name}</div>
                {customer.full_name && customer.full_name !== customer.name && (
                  <div className="text-gray-600">{customer.full_name}</div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  {customer.phone}
                </div>
                {customer.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </div>
                )}
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 mt-1" />
                  <div>
                    {customer.address}{customer.floor && `, ${customer.floor}`}
                    <br />
                    {customer.city && `${customer.city}, `}{customer.state} {customer.pincode}
                  </div>
                </div>
                {customer.gst_number && (
                  <div className="text-gray-600">
                    <strong>GST:</strong> {customer.gst_number}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 italic print:hidden">No customer selected</div>
            )}
          </div>

          <div>
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
                  <span>{selectedSalesman.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 pb-1">ITEMS</h3>
          
          {items.length > 0 ? (
            <div className="border border-gray-300">
              {/* Table Header */}
              <div className="bg-gray-100 grid grid-cols-16 gap-2 p-3 font-medium text-sm border-b border-gray-300">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-center">Cost</div>
                <div className="col-span-2 text-center">Rate</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-center">Discount</div>
                <div className="col-span-2 text-center">Final Rate</div>
                <div className="col-span-1 text-right">Amount</div>
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
                  <div key={item.id} className="grid grid-cols-16 gap-2 p-3 border-b border-gray-200 last:border-b-0">
                    <div className="col-span-1 text-center text-sm">{index + 1}</div>
                    
                    {/* Description */}
                    <div className="col-span-4">
                      <div className="font-medium text-sm">{displayName}</div>
                      {displayDescription && (
                        <div className="text-xs text-gray-600 mt-1">{displayDescription}</div>
                      )}
                      <div className="print:hidden mt-2 flex gap-1">
                        <Button
                          onClick={() => removeItem(item.id)}
                          variant="outline"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Cost */}
                    <div className="col-span-2 text-center text-sm">
                      <div className="text-gray-600">₹{productCost.toFixed(2)}</div>
                    </div>
                    
                    {/* Original Rate */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm">₹{item.originalPrice.toFixed(2)}</div>
                      <div className="print:hidden mt-1">
                        <Input
                          type="number"
                          value={item.originalPrice}
                          onChange={(e) => updateItemOriginalPrice(item.id, Number(e.target.value))}
                          className="w-20 h-6 text-xs"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    
                    {/* Quantity */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm">{item.quantity} pcs</div>
                      <div className="print:hidden mt-1">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItemQuantity(item.id, Number(e.target.value))}
                          className="w-16 h-6 text-xs"
                          min="1"
                        />
                      </div>
                    </div>
                    
                    {/* Discount */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm text-green-600">
                        {item.discountPercentage > 0 ? `${item.discountPercentage.toFixed(1)}%` : '-'}
                      </div>
                      <div className="text-xs text-green-600">
                        {item.discountAmount > 0 ? `₹${item.discountAmount.toFixed(2)}` : '-'}
                      </div>
                      <div className="print:hidden mt-1 flex gap-1">
                        <Input
                          type="number"
                          value={item.discountPercentage}
                          onChange={(e) => updateItemDiscountPercentage(item.id, Number(e.target.value))}
                          className="w-16 h-6 text-xs"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="%"
                        />
                      </div>
                    </div>
                    
                    {/* Final Rate */}
                    <div className="col-span-2 text-center">
                      <div className="text-sm font-medium">₹{item.finalPrice.toFixed(2)}</div>
                      <div className="print:hidden mt-1">
                        <Input
                          type="number"
                          value={item.finalPrice}
                          onChange={(e) => updateItemPrice(item.id, Number(e.target.value))}
                          className="w-20 h-6 text-xs"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                    
                    {/* Amount */}
                    <div className="col-span-1 text-right font-medium text-sm">₹{item.totalPrice.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 italic py-8 print:hidden">
              No items added yet
            </div>
          )}
        </div>

        {/* Totals Section */}
        <div className="flex justify-end">
          <div className="w-full md:w-1/2">
            <div className="border border-gray-300">
              <div className="bg-gray-100 p-3 font-medium border-b border-gray-300">
                INVOICE SUMMARY
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                
                {/* Individual Item Discounts */}
                {itemDiscountAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Item Discounts:</span>
                    <span>-₹{itemDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Global Discount */}
                {globalDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Additional Discount ({globalDiscountType === 'percentage' ? globalDiscount + '%' : '₹' + globalDiscount}):</span>
                    <span>-₹{globalDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Total Discount Summary */}
                {totalDiscountAmount > 0 && (
                  <div className="flex justify-between text-purple-600 font-medium border-t border-gray-200 pt-2">
                    <span>Total Discounts ({((totalDiscountAmount / subtotal) * 100).toFixed(1)}%):</span>
                    <span>-₹{totalDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Taxable Amount:</span>
                  <span>₹{taxableAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Tax ({taxPercentage}%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                
                {freightCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Freight Charges:</span>
                    <span>₹{freightCharges.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL:</span>
                    <span>₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Discount and Freight Controls - Only visible on screen */}
              <div className="print:hidden p-3 border-t border-gray-200 bg-gray-50 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Discount</Label>
                    <div className="flex">
                      <Input
                        type="number"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                        className="h-8 text-xs"
                        min="0"
                      />
                      <Select value={globalDiscountType} onValueChange={(value: 'percentage' | 'amount') => setGlobalDiscountType(value)}>
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="amount">₹</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Tax %</Label>
                    <Input
                      type="number"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(Number(e.target.value))}
                      className="h-8 text-xs"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Delivery Floor</Label>
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
                    <SelectTrigger className="h-8 text-xs">
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
                    <div className="text-xs text-orange-600 mt-1 p-1 bg-orange-50 rounded">
                      ⚠️ 1st Floor Delivery: Prepare tools for reassembly
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Freight Charges</Label>
                  <Input
                    type="number"
                    value={freightCharges}
                    onChange={(e) => setFreightCharges(Number(e.target.value))}
                    className="h-8 text-xs"
                    min="0"
                  />
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
            onClick={() => onCreateQuoteAndSalesOrder?.(getCurrentBillingData())}
            disabled={!customer || items.length === 0 || isProcessing || externalIsProcessing}
            variant="outline"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Create Quote & Sales Order
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
        </div>
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custom-price">Price *</Label>
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
                <div>
                  <Label htmlFor="custom-category">Category</Label>
                  <Input
                    id="custom-category"
                    value={customProductForm.category}
                    onChange={(e) => setCustomProductForm({...customProductForm, category: e.target.value})}
                    placeholder="Category"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custom-material">Material</Label>
                  <Input
                    id="custom-material"
                    value={customProductForm.material}
                    onChange={(e) => setCustomProductForm({...customProductForm, material: e.target.value})}
                    placeholder="Material"
                  />
                </div>
                <div>
                  <Label htmlFor="custom-subcategory">Subcategory</Label>
                  <Input
                    id="custom-subcategory"
                    value={customProductForm.subcategory}
                    onChange={(e) => setCustomProductForm({...customProductForm, subcategory: e.target.value})}
                    placeholder="Subcategory"
                  />
                </div>
              </div>

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
        orderAmount={grandTotal}
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
    </div>
  );
}
