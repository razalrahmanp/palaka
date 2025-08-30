"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Package, 
  CreditCard, 
  FileText,
  Calculator,
  ShoppingCart,
  DollarSign,
  Save,
  Send,
  Edit,
  Check,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
  RefreshCw,
  ArrowRight,
  Clock
} from "lucide-react";
import { ProductWithInventory, BillingCustomer, BillingItem, CustomProduct, PaymentMethod, BillingData } from "@/types";
import { BajajFinanceCalculator, BajajFinanceData } from "./BajajFinanceCalculator";

// Workflow States
enum WorkflowStep {
  QUOTE = 'quote',
  PAYMENT = 'payment',
  SALES_ORDER = 'sales_order', 
  INVOICE = 'invoice'
}

// Interfaces for Quote/Sales Order selection
interface QuoteData {
  id: string;
  customer: string;
  total_price: number;
  status: string;
  created_at: string;
  items: BillingItem[];
}

interface SalesOrderData {
  id: string;
  customer: { name: string } | string;
  total: number;
  status: string;
  created_at: string;
  items: BillingItem[];
}

interface ProfessionalBillingProps {
  onSave?: (data: BillingData) => void;
  onGenerateQuote?: (data: BillingData) => void;
  onGenerateInvoice?: (data: BillingData) => void;
  onGenerateSalesOrder?: (data: BillingData) => void;
  isProcessing?: boolean;
}

export function ProfessionalBillingDashboard({
  onSave,
  onGenerateQuote,
  onGenerateInvoice,
  onGenerateSalesOrder,
  isProcessing: externalIsProcessing = false
}: ProfessionalBillingProps) {
  // Core State
  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [items, setItems] = useState<BillingItem[]>([]);
  const [notes, setNotes] = useState('');
  
  // Workflow State
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(WorkflowStep.QUOTE);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [salesOrderId, setSalesOrderId] = useState<string | null>(null);
  
  // Search & Product States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductWithInventory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Customer States
  const [customerForm, setCustomerForm] = useState<Partial<BillingCustomer>>({
    customer_id: '',
    name: '', // Required
    phone: '', // Required (contact)
    email: '',
    address: '', // Required
    floor: '', // Required
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    full_name: '',
    notes: ''
  });
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<BillingCustomer[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  
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
    lead_time_days: 30
  });
  
  // Pricing States
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [globalDiscountType, setGlobalDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [taxPercentage, setTaxPercentage] = useState(18);
  const [freightCharges, setFreightCharges] = useState(0);
  
  // Payment States
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // Bajaj Finance States
  const [showBajajCalculator, setShowBajajCalculator] = useState(false);
  const [bajajFinanceData, setBajajFinanceData] = useState<BajajFinanceData | null>(null);
  
  // UI States
  const [activeSection, setActiveSection] = useState<'customer' | 'products' | 'payment'>('customer');
  const [isProcessing, setIsProcessing] = useState(false);

  // Quote/Sales Order Selection States
  const [availableQuotes, setAvailableQuotes] = useState<QuoteData[]>([]);
  const [availableSalesOrders, setAvailableSalesOrders] = useState<SalesOrderData[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>('');
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string>('');
  const [showQuoteSelection, setShowQuoteSelection] = useState(false);

  // Salesman/Employee Selection States
  const [selectedSalesman, setSelectedSalesman] = useState<{ id: string; name: string; email?: string; user_id?: string } | null>(null);
  const [availableSalespeople, setAvailableSalespeople] = useState<{ id: string; name: string; email?: string; user_id?: string }[]>([]);

  // Calculations with correct terminology
  const originalPrice = items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
  const itemDiscounts = items.reduce((sum, item) => sum + ((item.discountAmount || 0) * item.quantity), 0);
  const totalPrice = originalPrice - itemDiscounts; // After individual discounts
  const globalDiscountAmount = globalDiscountType === 'percentage' 
    ? totalPrice * globalDiscount / 100 
    : globalDiscount;
  const finalPrice = totalPrice - globalDiscountAmount; // What customer pays
  const taxAmount = finalPrice * taxPercentage / 100;
  const grandTotal = finalPrice + taxAmount + freightCharges;

  // Helper function to get current billing data
  const getCurrentBillingData = (): BillingData => ({
    customer,
    items,
    paymentMethods,
    finalTotal: grandTotal,
    notes,
    selectedSalesman,
    totals: {
      original_price: originalPrice,
      total_price: totalPrice,
      final_price: finalPrice,
      discount_amount: itemDiscounts + globalDiscountAmount,
      subtotal: finalPrice,
      tax: taxAmount,
      freight_charges: freightCharges,
      grandTotal
    }
  });

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
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  // Fetch Employees/Salespeople
  const fetchSalespeople = useCallback(async () => {
    try {
      const response = await fetch('/api/hr/employees');
      const data = await response.json();
      
      if (response.ok) {
        // Transform employees to include user_id for created_by
        interface EmployeeData {
          id: string;
          name: string;
          email?: string;
          user_id?: string;
          user?: {
            id: string;
            name: string;
            email: string;
          };
        }
        
        const salespeople = data.map((employee: EmployeeData) => ({
          id: employee.id,
          name: employee.name || employee.user?.name,
          email: employee.email || employee.user?.email,
          user_id: employee.user_id || employee.user?.id
        })).filter((person: { user_id?: string }) => person.user_id); // Only include employees with user accounts
        
        setAvailableSalespeople(salespeople);
      } else {
        console.error('Failed to fetch employees:', data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, []);

  // Load employees on component mount
  useEffect(() => {
    fetchSalespeople();
  }, [fetchSalespeople]);

  // Product Management
  const addProduct = (product: ProductWithInventory) => {
    const newItem: BillingItem = {
      id: Date.now().toString(),
      product,
      quantity: 1,
      originalPrice: Number(product.price),
      finalPrice: Number(product.price),
      totalPrice: Number(product.price),
      discountAmount: 0,
      discountPercentage: 0,
      tax: Number(product.price) * (taxPercentage / 100),
      isCustom: false
    };
    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const totalPrice = item.finalPrice * quantity;
        return { ...item, quantity, totalPrice, tax: totalPrice * (taxPercentage / 100) };
      }
      return item;
    }));
  };

  const updateItemDiscount = (itemId: string, discount: number, type: 'percentage' | 'amount') => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        let discountAmount = 0;
        let finalPrice = item.originalPrice;
        
        if (type === 'percentage') {
          discountAmount = item.originalPrice * discount / 100;
          finalPrice = item.originalPrice - discountAmount;
        } else {
          discountAmount = discount;
          finalPrice = Math.max(0, item.originalPrice - discount);
        }
        
        const totalPrice = finalPrice * item.quantity;
        return {
          ...item,
          discountPercentage: type === 'percentage' ? discount : 0,
          discountAmount,
          finalPrice,
          totalPrice,
          tax: totalPrice * (taxPercentage / 100)
        };
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

   // Customer Search Functions
  const searchCustomers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/crm/customers/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      
      if (response.ok) {
        setCustomerSearchResults(data.customers || []);
      } else {
        setCustomerSearchResults([]);
      }
    } catch (error) {
      console.error('Customer search failed:', error);
      setCustomerSearchResults([]);
    }
  }, []);

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery, searchCustomers]);

  const selectCustomer = (selectedCustomer: BillingCustomer) => {
    setCustomer(selectedCustomer);
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
    setShowCustomerSearch(false);
  };

  const editCustomer = () => {
    if (customer) {
      setCustomerForm({
        customer_id: customer.customer_id,
        name: customer.name,
        full_name: customer.full_name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        floor: customer.floor,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        gst_number: customer.gst_number,
        notes: customer.notes
      });
      setShowCustomerForm(true);
      setCustomer(null); // Clear customer to show form
    }
  };

  const createNewCustomer = async () => {
    try {
      const response = await fetch('/api/crm/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customerForm.name,
          email: customerForm.email,
          phone: customerForm.phone,
          address: customerForm.address,
          floor: customerForm.floor,
          city: customerForm.city,
          state: customerForm.state,
          pincode: customerForm.pincode,
          notes: customerForm.notes,
          status: 'active',
          source: 'billing_system',
          created_by: 'current_user_id' // Replace with actual user ID
        }),
      });

      if (response.ok) {
        const newCustomer = await response.json();
        setCustomer({
          customer_id: newCustomer[0]?.id || Date.now().toString(),
          id: newCustomer[0]?.id,
          name: customerForm.name || '',
          full_name: customerForm.full_name,
          email: customerForm.email,
          phone: customerForm.phone,
          address: customerForm.address,
          floor: customerForm.floor,
          city: customerForm.city,
          state: customerForm.state,
          pincode: customerForm.pincode,
          gst_number: customerForm.gst_number,
          notes: customerForm.notes
        });
        setShowCustomerForm(false);
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
          gst_number: '',
          full_name: '',
          notes: ''
        });
      } else {
        console.error('Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  };

  // Clear Functions
  const clearCustomer = () => {
    setCustomer(null);
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
      gst_number: '',
      full_name: '',
      notes: ''
    });
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
    setShowCustomerForm(false);
    setShowCustomerSearch(false);
  };

  const clearAllData = () => {
    // Clear customer
    clearCustomer();
    
    // Clear items
    setItems([]);
    
    // Clear search
    setSearchQuery('');
    setSearchResults([]);
    
    // Clear custom product form
    setCustomProductForm({
      name: '',
      description: '',
      category: '',
      subcategory: '',
      price: 0,
      cost_price: null,
      material: '',
      lead_time_days: 30
    });
    setShowCustomProductForm(false);
    
    // Clear pricing
    setGlobalDiscount(0);
    setGlobalDiscountType('percentage');
    setTaxPercentage(18);
    setFreightCharges(0);
    
    // Clear payment methods
    setPaymentMethods([]);
    
    // Clear Bajaj finance
    setBajajFinanceData(null);
    setShowBajajCalculator(false);
    
    // Clear workflow
    setCurrentStep(WorkflowStep.QUOTE);
    setQuoteId(null);
    setSalesOrderId(null);
    
    // Clear notes
    setNotes('');
    
    // Reset to customer section
    setActiveSection('customer');
  };

  // Custom Product Functions
  const createCustomProduct = async () => {
    try {
      const response = await fetch('/api/products/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...customProductForm,
          created_by: 'current_user_id' // Replace with actual user ID
        }),
      });

      if (response.ok) {
        const customProduct = await response.json();
        
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
        setCustomProductForm({
          name: '',
          description: '',
          category: '',
          subcategory: '',
          price: 0,
          cost_price: null,
          material: '',
          lead_time_days: 30
        });
      } else {
        console.error('Failed to create custom product');
      }
    } catch (error) {
      console.error('Error creating custom product:', error);
    }
  };

  // Payment Management
  const addPaymentMethod = () => {
    const newPayment: PaymentMethod = {
      id: Date.now().toString(),
      type: 'cash',
      amount: grandTotal
    };
    setPaymentMethods(prev => [...prev, newPayment]);
  };

  const updatePaymentMethod = (id: string, updates: Partial<PaymentMethod>) => {
    setPaymentMethods(prev => prev.map(payment => 
      payment.id === id ? { ...payment, ...updates } : payment
    ));
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods(prev => prev.filter(payment => payment.id !== id));
  };

  // Internal billing handlers with workflow support
  const handleGenerateQuote = async () => {
    if (onGenerateQuote) {
      onGenerateQuote(getCurrentBillingData());
      return;
    }

    // Internal quote generation with proper pricing structure
    try {
      setIsProcessing(true);
      const billingData = getCurrentBillingData();
      
      // Separate custom products from regular products
      const regularItems = items.filter(item => !item.isCustom);
      const customItems = items.filter(item => item.isCustom);
      
      const response = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: billingData.customer,
          items: regularItems, // Only regular products go in quotes.items
          customItems: customItems, // Custom products for quote_custom_items table
          totals: billingData.totals, // Use the correct totals from getCurrentBillingData
          bajajFinanceData: bajajFinanceData,
          billingType: 'quote',
          notes: notes
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setQuoteId(result.quote_id);
        setCurrentStep(WorkflowStep.PAYMENT); // Move to payment session instead of sales order
        alert(`Quote created successfully! Quote ID: ${result.quote_id}`);
      } else {
        const error = await response.json();
        alert(`Failed to create quote: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating quote:', error);
      alert('Failed to create quote. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSalesOrder = async () => {
    if (!quoteId) {
      alert('Please create a quote first');
      return;
    }

    if (onGenerateSalesOrder) {
      onGenerateSalesOrder(getCurrentBillingData());
      return;
    }

    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: quoteId,
          customer_id: customer?.customer_id,
          notes: notes
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSalesOrderId(result.sales_order_id);
        setCurrentStep(WorkflowStep.INVOICE);
        alert(`Sales Order created successfully! Sales Order ID: ${result.sales_order_id}`);
      } else {
        const error = await response.json();
        alert(`Failed to create sales order: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating sales order:', error);
      alert('Failed to create sales order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!salesOrderId) {
      alert('Please create a sales order first');
      return;
    }

    if (onGenerateInvoice) {
      onGenerateInvoice(getCurrentBillingData());
      return;
    }

    // Internal invoice generation
    try {
      setIsProcessing(true);
      const billingData = getCurrentBillingData();
      
      const response = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sales_order_id: salesOrderId,
          customer: billingData.customer,
          items: billingData.items,
          totals: billingData.totals,
          paymentMethod: paymentMethods[0]?.type || 'cash',
          billingType: 'invoice'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Invoice created successfully! Invoice ID: ${result.invoice_id}`);
        
        // Ask if user wants to create a new transaction
        if (confirm('Invoice created successfully! Would you like to start a new transaction?')) {
          clearAllData();
        }
      } else {
        const error = await response.json();
        alert(`Failed to create invoice: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quote and Sales Order loading functions
  const loadAvailableQuotes = async () => {
    try {
      const response = await fetch('/api/sales/quotes');
      if (response.ok) {
        const quotes = await response.json();
        setAvailableQuotes(quotes || []);
      }
    } catch (error) {
      console.error('Error loading quotes:', error);
    }
  };

  const loadAvailableSalesOrders = async () => {
    try {
      const response = await fetch('/api/sales/orders');
      if (response.ok) {
        const orders = await response.json();
        setAvailableSalesOrders(orders || []);
      }
    } catch (error) {
      console.error('Error loading sales orders:', error);
    }
  };

  // Load quotes and sales orders when payment session opens
  useEffect(() => {
    if (showQuoteSelection) {
      loadAvailableQuotes();
      loadAvailableSalesOrders();
    }
  }, [showQuoteSelection]);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Professional Billing</h1>
                <p className="text-sm text-gray-600">Complete billing solution in one view</p>
              </div>
              
              {/* Workflow Progress */}
              <div className="flex items-center space-x-2">
                <Badge variant={currentStep === WorkflowStep.QUOTE ? "default" : quoteId ? "secondary" : "outline"}>
                  <Clock className="h-3 w-3 mr-1" />
                  Quote {quoteId && `(${quoteId.slice(0, 8)}...)`}
                </Badge>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <Badge variant={currentStep === WorkflowStep.PAYMENT ? "default" : "outline"}>
                  <CreditCard className="h-3 w-3 mr-1" />
                  Payment Session
                </Badge>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <Badge variant={currentStep === WorkflowStep.SALES_ORDER ? "default" : salesOrderId ? "secondary" : "outline"}>
                  <FileText className="h-3 w-3 mr-1" />
                  Sales Order {salesOrderId && `(${salesOrderId.slice(0, 8)}...)`}
                </Badge>
                <ArrowRight className="h-4 w-4 text-gray-400" />
                <Badge variant={currentStep === WorkflowStep.INVOICE ? "default" : "outline"}>
                  <Send className="h-3 w-3 mr-1" />
                  Invoice
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Clear Button */}
              <Button 
                variant="outline" 
                onClick={clearAllData}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => onSave?.(getCurrentBillingData())}
                disabled={isProcessing || externalIsProcessing}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              
              {/* Workflow Buttons */}
              {currentStep === WorkflowStep.QUOTE && (
                <Button 
                  variant="outline" 
                  onClick={handleGenerateQuote}
                  disabled={!customer || items.length === 0 || isProcessing || externalIsProcessing}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Quote
                </Button>
              )}
              
              {currentStep === WorkflowStep.PAYMENT && quoteId && (
                <Button 
                  variant="outline"
                  onClick={() => setShowQuoteSelection(true)}
                  disabled={isProcessing || externalIsProcessing}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Select Quote/Order
                </Button>
              )}
              
              {currentStep === WorkflowStep.SALES_ORDER && quoteId && (
                <Button 
                  variant="outline"
                  onClick={handleGenerateSalesOrder}
                  disabled={isProcessing || externalIsProcessing}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create Sales Order
                </Button>
              )}
              
              {currentStep === WorkflowStep.INVOICE && salesOrderId && (
                <Button 
                  onClick={handleGenerateInvoice}
                  disabled={isProcessing || externalIsProcessing}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              )}
              
              {/* Fallback button if no workflow step is active */}
              {currentStep === WorkflowStep.QUOTE && !quoteId && (
                <Button 
                  onClick={handleGenerateQuote}
                  disabled={!customer || items.length === 0 || isProcessing || externalIsProcessing}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Start with Quote
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Customer & Products */}
          <div className="w-2/3 flex flex-col border-r bg-white">
            {/* Section Tabs */}
            <div className="border-b px-6 py-3">
              <div className="flex space-x-6">
                {[
                  { key: 'customer', label: 'Customer', icon: User },
                  { key: 'products', label: 'Products', icon: Package },
                  { key: 'payment', label: 'Payment', icon: CreditCard }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveSection(key as 'customer' | 'products' | 'payment')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeSection === key 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
              {/* Customer Section */}
              {activeSection === 'customer' && (
                <div className="p-6">
                  {/* Salesman Selection - Always show at top */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Select Salesman
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <Label htmlFor="salesman" className="text-base font-medium">
                          Salesman/Sales Representative *
                        </Label>
                        <Select 
                          value={selectedSalesman?.id || ''} 
                          onValueChange={(salesmanId) => {
                            const salesman = availableSalespeople.find(s => s.id === salesmanId);
                            setSelectedSalesman(salesman || null);
                          }}
                        >
                          <SelectTrigger 
                            id="salesman"
                            className="h-12 text-base border-2 border-gray-200 focus:border-blue-500 hover:border-gray-300 transition-colors"
                          >
                            <SelectValue placeholder="Select a salesman..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {availableSalespeople.map((person) => (
                              <SelectItem key={person.id} value={person.id} className="py-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900">{person.name}</div>
                                    {person.email && (
                                      <div className="text-sm text-gray-500">{person.email}</div>
                                    )}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedSalesman && (
                          <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                            <Check className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-green-700 font-medium">
                              Selected: {selectedSalesman.name}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {!customer ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Customer Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Customer Search */}
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={showCustomerSearch ? "default" : "outline"}
                              onClick={() => {
                                setShowCustomerSearch(!showCustomerSearch);
                                setShowCustomerForm(false);
                              }}
                              className="flex-1"
                            >
                              <Search className="h-4 w-4 mr-2" />
                              Search Existing Customer
                            </Button>
                            <Button
                              type="button"
                              variant={showCustomerForm ? "default" : "outline"}
                              onClick={() => {
                                setShowCustomerForm(!showCustomerForm);
                                setShowCustomerSearch(false);
                              }}
                              className="flex-1"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create New Customer
                            </Button>
                          </div>

                          {/* Customer Search Section */}
                          {showCustomerSearch && (
                            <div className="space-y-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                  placeholder="Search by name, phone, or email..."
                                  value={customerSearchQuery}
                                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                                  className="pl-10"
                                />
                              </div>

                              {/* Search Results */}
                              {customerSearchResults.length > 0 && (
                                <div className="mt-4 max-h-40 overflow-y-auto border rounded-md">
                                  <div className="p-4 space-y-3">
                                    {customerSearchResults.map((customer) => (
                                      <div 
                                        key={customer.id}
                                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded cursor-pointer border-b last:border-b-0"
                                        onClick={() => selectCustomer(customer)}
                                      >
                                        <div className="flex-1">
                                          <p className="font-medium text-sm">{customer.name}</p>
                                          {customer.email && <p className="text-xs text-gray-500">{customer.email}</p>}
                                          {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
                                        </div>
                                        <div className="text-right">
                                          {customer.customer_type && <p className="text-xs text-gray-600">{customer.customer_type}</p>}
                                          {customer.city && <p className="text-xs text-gray-500">{customer.city}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Customer Form Section */}
                          {showCustomerForm && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor="name">Customer Name *</Label>
                                  <Input
                                    id="name"
                                    value={customerForm.name}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter customer name"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="phone">Contact Number *</Label>
                                  <Input
                                    id="phone"
                                    value={customerForm.phone}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="Enter contact number"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="email">Email</Label>
                                  <Input
                                    id="email"
                                    type="email"
                                    value={customerForm.email}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="Enter email address"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="floor">Floor *</Label>
                                  <Input
                                    id="floor"
                                    value={customerForm.floor}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, floor: e.target.value }))}
                                    placeholder="Enter floor number"
                                    required
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="city">City</Label>
                                  <Input
                                    id="city"
                                    value={customerForm.city}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                                    placeholder="Enter city"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="state">State</Label>
                                  <Input
                                    id="state"
                                    value={customerForm.state}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, state: e.target.value }))}
                                    placeholder="Enter state"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="pincode">Pincode</Label>
                                  <Input
                                    id="pincode"
                                    value={customerForm.pincode}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, pincode: e.target.value }))}
                                    placeholder="Enter pincode"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="gst">GST Number</Label>
                                  <Input
                                    id="gst"
                                    value={customerForm.gst_number}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, gst_number: e.target.value }))}
                                    placeholder="Enter GST number"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="address">Address *</Label>
                                <Textarea
                                  id="address"
                                  value={customerForm.address}
                                  onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                                  placeholder="Enter customer address"
                                  rows={3}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={customerForm.notes}
                                  onChange={(e) => setCustomerForm(prev => ({ ...prev, notes: e.target.value }))}
                                  placeholder="Enter any additional notes"
                                  rows={2}
                                />
                              </div>
                              <Button 
                                onClick={createNewCustomer}
                                disabled={!customerForm.name?.trim() || !customerForm.phone?.trim() || !customerForm.address?.trim() || !customerForm.floor?.trim()}
                                className="w-full"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Create Customer
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Customer Details
                          </span>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={clearCustomer}>
                              <X className="h-4 w-4 mr-2" />
                              Clear
                            </Button>
                            <Button variant="outline" size="sm" onClick={editCustomer}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{customer.name}</span>
                          </div>
                          {customer.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span>{customer.phone}</span>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span>{customer.email}</span>
                            </div>
                          )}
                          {customer.address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span>{customer.address}</span>
                            </div>
                          )}
                          {customer.floor && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              <span>Floor: {customer.floor}</span>
                            </div>
                          )}
                          {customer.city && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span>{customer.city}{customer.state && `, ${customer.state}`}{customer.pincode && ` - ${customer.pincode}`}</span>
                            </div>
                          )}
                          {customer.gst_number && (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-500" />
                              <span>GST: {customer.gst_number}</span>
                            </div>
                          )}
                          {customer.notes && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                              <span className="text-sm text-gray-600">{customer.notes}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Products Section */}
              {activeSection === 'products' && (
                <div className="p-6 space-y-6">
                  {/* Product Search */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Search className="h-5 w-5" />
                          Product Search
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCustomProductForm(!showCustomProductForm)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Custom Product
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search products by name, SKU, or supplier..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-3">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                          </div>
                        )}
                      </div>
                      
                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="mt-4 h-40 border rounded-md overflow-y-auto">
                          <div className="p-2">
                            {searchResults.map((product) => (
                              <div
                                key={product.product_id}
                                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                                onClick={() => addProduct(product)}
                              >
                                <div>
                                  <p className="font-medium">{product.product_name}</p>
                                  <p className="text-sm text-gray-500">
                                    SKU: {product.sku} | Stock: {product.quantity}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">₹{product.price}</p>
                                  <Button size="sm" variant="outline">
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Product Form */}
                      {showCustomProductForm && (
                        <Card className="border-2 border-dashed">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <Package className="h-5 w-5" />
                              Create Custom Product
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="customName">Product Name *</Label>
                                <Input
                                  id="customName"
                                  value={customProductForm.name}
                                  onChange={(e) => setCustomProductForm(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Enter product name"
                                />
                              </div>
                              <div>
                                <Label htmlFor="customPrice">Selling Price (MRP) *</Label>
                                <Input
                                  id="customPrice"
                                  type="number"
                                  value={customProductForm.price}
                                  onChange={(e) => setCustomProductForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                                  placeholder="Enter selling price"
                                />
                              </div>
                              <div>
                                <Label htmlFor="customCostPrice">Cost Price</Label>
                                <Input
                                  id="customCostPrice"
                                  type="number"
                                  value={customProductForm.cost_price || ''}
                                  onChange={(e) => setCustomProductForm(prev => ({ ...prev, cost_price: Number(e.target.value) || null }))}
                                  placeholder="Auto-calculated (70% of MRP)"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Leave empty to auto-calculate as 70% of selling price
                                </p>
                              </div>
                              <div>
                                <Label htmlFor="customCategory">Category</Label>
                                <Input
                                  id="customCategory"
                                  value={customProductForm.category}
                                  onChange={(e) => setCustomProductForm(prev => ({ ...prev, category: e.target.value }))}
                                  placeholder="Enter category"
                                />
                              </div>
                              <div>
                                <Label htmlFor="customMaterial">Material</Label>
                                <Input
                                  id="customMaterial"
                                  value={customProductForm.material}
                                  onChange={(e) => setCustomProductForm(prev => ({ ...prev, material: e.target.value }))}
                                  placeholder="Enter material"
                                />
                              </div>
                            </div>
                            {/* Margin Display */}
                            {customProductForm.price > 0 && (customProductForm.cost_price || customProductForm.price * 0.7) > 0 && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-blue-700">
                                    Cost: ₹{(customProductForm.cost_price || customProductForm.price * 0.7).toFixed(2)}
                                  </span>
                                  <span className="text-sm font-medium text-blue-700">
                                    Margin: {(((customProductForm.price - (customProductForm.cost_price || customProductForm.price * 0.7)) / customProductForm.price) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            )}
                            <div>
                              <Label htmlFor="customDescription">Description</Label>
                              <Textarea
                                id="customDescription"
                                value={customProductForm.description}
                                onChange={(e) => setCustomProductForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter product description"
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={createCustomProduct}
                                disabled={!customProductForm.name.trim() || customProductForm.price <= 0}
                                className="flex-1"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Custom Product
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setShowCustomProductForm(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cart Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        Cart Items ({items.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {items.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No items added yet</p>
                          <p className="text-sm">Search and add products above</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {items.map((item) => (
                            <div key={item.id} className="border rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h4 className="font-medium">
                                    {item.product?.product_name || item.customProduct?.name}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    SKU: {item.product?.sku || 'CUSTOM'}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(item.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-4">
                                <div>
                                  <Label>Quantity</Label>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateItemQuantity(item.id, Math.max(1, item.quantity - 1))}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateItemQuantity(item.id, Math.max(1, parseInt(e.target.value) || 1))}
                                      className="w-16 text-center"
                                      min="1"
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label>Unit Price</Label>
                                  <Input
                                    type="number"
                                    value={item.originalPrice}
                                    readOnly
                                    className="bg-gray-50"
                                  />
                                </div>
                                
                                <div>
                                  <Label>Discount %</Label>
                                  <Input
                                    type="number"
                                    value={item.discountPercentage}
                                    onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0, 'percentage')}
                                    min="0"
                                    max="100"
                                  />
                                </div>
                                
                                <div>
                                  <Label>Total</Label>
                                  <Input
                                    value={`₹${item.totalPrice.toFixed(2)}`}
                                    readOnly
                                    className="bg-gray-50 font-medium"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Global Pricing */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Pricing & Taxes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Global Discount</Label>
                          <div className="flex space-x-2">
                            <Input
                              type="number"
                              value={globalDiscount}
                              onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                              placeholder="0"
                            />
                            <Select value={globalDiscountType} onValueChange={(value: 'percentage' | 'amount') => setGlobalDiscountType(value)}>
                              <SelectTrigger className="w-20">
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
                          <Label>Tax Rate (%)</Label>
                          <Input
                            type="number"
                            value={taxPercentage}
                            onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                          />
                        </div>
                        
                        <div>
                          <Label>Freight Charges</Label>
                          <Input
                            type="number"
                            value={freightCharges}
                            onChange={(e) => setFreightCharges(parseFloat(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Payment Section */}
              {activeSection === 'payment' && (
                <div className="p-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Methods
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {paymentMethods.length === 0 ? (
                        <div className="text-center py-8">
                          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-gray-500 mb-4">No payment methods added</p>
                          <Button onClick={addPaymentMethod}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Payment Method
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {paymentMethods.map((payment) => (
                            <div key={payment.id} className="border rounded-lg p-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label>Payment Type</Label>
                                  <Select 
                                    value={payment.type} 
                                    onValueChange={(value) => updatePaymentMethod(payment.id, { type: value as 'cash' | 'card' | 'upi' | 'bank_transfer' | 'cheque' | 'emi' })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cash">Cash</SelectItem>
                                      <SelectItem value="card">Card</SelectItem>
                                      <SelectItem value="upi">UPI</SelectItem>
                                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                      <SelectItem value="cheque">Cheque</SelectItem>
                                      <SelectItem value="emi">EMI</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <div>
                                  <Label>Amount</Label>
                                  <Input
                                    type="number"
                                    value={payment.amount}
                                    onChange={(e) => updatePaymentMethod(payment.id, { amount: parseFloat(e.target.value) || 0 })}
                                  />
                                </div>
                                
                                <div className="flex items-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removePaymentMethod(payment.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {payment.type !== 'cash' && (
                                <div className="mt-3">
                                  <Label>Reference/Transaction ID</Label>
                                  <Input
                                    value={payment.reference || ''}
                                    onChange={(e) => updatePaymentMethod(payment.id, { reference: e.target.value })}
                                    placeholder="Enter reference number"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          
                          <Button variant="outline" onClick={addPaymentMethod} className="w-full">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Another Payment Method
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Bajaj Finance EMI Calculator */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Bajaj Finance EMI
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bajajFinanceData ? (
                        <div className="space-y-3">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-green-800">EMI Plan Selected</span>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setBajajFinanceData(null)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Plan:</span>
                                <span className="font-medium ml-2">{bajajFinanceData.plan.months} months</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Monthly EMI:</span>
                                <span className="font-medium ml-2">₹{bajajFinanceData.monthlyEMI.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Down Payment:</span>
                                <span className="font-medium ml-2">₹{bajajFinanceData.downPayment.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Finance Amount:</span>
                                <span className="font-medium ml-2">₹{bajajFinanceData.financeAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="text-gray-500 mb-4">Calculate EMI for this order</p>
                          <Button 
                            onClick={() => setShowBajajCalculator(true)}
                            disabled={grandTotal === 0}
                          >
                            <Calculator className="h-4 w-4 mr-2" />
                            Calculate EMI
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>

          {/* Quote/Sales Order Selection Modal */}
          {showQuoteSelection && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Select Quote or Sales Order</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowQuoteSelection(false)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                  <div className="mb-6">
                    <h3 className="text-md font-medium text-gray-900 mb-3">Available Quotes</h3>
                    <div className="space-y-3">
                      {availableQuotes.length === 0 ? (
                        <p className="text-gray-500 italic">No quotes available</p>
                      ) : (
                        availableQuotes.map((quote: QuoteData) => (
                          <div 
                            key={quote.id} 
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedQuoteId === quote.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedQuoteId(quote.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">Quote #{quote.id?.slice(0, 8)}</p>
                                <p className="text-sm text-gray-600">{quote.customer}</p>
                                <p className="text-sm text-gray-500">₹{quote.total_price?.toLocaleString()}</p>
                              </div>
                              <Badge variant={quote.status === 'Draft' ? 'outline' : 'secondary'}>
                                {quote.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-md font-medium text-gray-900 mb-3">Available Sales Orders</h3>
                    <div className="space-y-3">
                      {availableSalesOrders.length === 0 ? (
                        <p className="text-gray-500 italic">No sales orders available</p>
                      ) : (
                        availableSalesOrders.map((order: SalesOrderData) => (
                          <div 
                            key={order.id} 
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedSalesOrderId === order.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedSalesOrderId(order.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">Order #{order.id?.slice(0, 8)}</p>
                                <p className="text-sm text-gray-600">
                                  {typeof order.customer === 'string' ? order.customer : order.customer?.name}
                                </p>
                                <p className="text-sm text-gray-500">₹{order.total?.toLocaleString()}</p>
                              </div>
                              <Badge variant={order.status === 'confirmed' ? 'default' : 'outline'}>
                                {order.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowQuoteSelection(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      // TODO: Load selected quote/order data and proceed to payment
                      setShowQuoteSelection(false);
                    }}
                    disabled={!selectedQuoteId && !selectedSalesOrderId}
                  >
                    Proceed to Payment
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Bajaj Finance Calculator Modal */}
          <BajajFinanceCalculator
            isOpen={showBajajCalculator}
            orderAmount={grandTotal}
            customerId={customer?.customer_id || ''}
            onClose={() => setShowBajajCalculator(false)}
            onSelect={(financeData) => {
              setBajajFinanceData(financeData);
              setShowBajajCalculator(false);
            }}
          />

          {/* Right Panel - Summary & Actions */}
          <div className="w-1/3 bg-gray-50 flex flex-col">
            {/* Order Summary */}
            <Card className="m-4 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Original Price (MRP):</span>
                  <span>₹{originalPrice.toFixed(2)}</span>
                </div>
                
                {itemDiscounts > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Product Discounts:</span>
                    <span>-₹{itemDiscounts.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Total (After Discounts):</span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </div>
                
                {globalDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Special Discount:</span>
                    <span>-₹{globalDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between font-medium">
                  <span>Final Amount:</span>
                  <span>₹{finalPrice.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Tax ({taxPercentage}%):</span>
                  <span>₹{taxAmount.toFixed(2)}</span>
                </div>
                
                {freightCharges > 0 && (
                  <div className="flex justify-between">
                    <span>Freight:</span>
                    <span>₹{freightCharges.toFixed(2)}</span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toFixed(2)}</span>
                </div>
                
                {paymentMethods.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">Payment Breakdown:</h4>
                      {paymentMethods.map((payment) => (
                        <div key={payment.id} className="flex justify-between text-sm">
                          <span className="capitalize">{payment.type}:</span>
                          <span>₹{payment.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-medium pt-2 border-t">
                        <span>Balance:</span>
                        <span className={grandTotal - paymentMethods.reduce((sum, p) => sum + p.amount, 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                          ₹{(grandTotal - paymentMethods.reduce((sum, p) => sum + p.amount, 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card className="mx-4 mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="mt-auto p-4 bg-white border-t">
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    {!customer && "Select customer to continue"}
                    {customer && items.length === 0 && "Add products to continue"}
                    {customer && items.length > 0 && "Ready to process"}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => onGenerateQuote?.(getCurrentBillingData())}
                    disabled={!customer || items.length === 0}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Quote
                  </Button>
                  
                  <Button 
                    onClick={() => onGenerateInvoice?.(getCurrentBillingData())}
                    disabled={!customer || items.length === 0}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Generate Invoice
                  </Button>
                  
                  <Button 
                    variant="secondary"
                    onClick={() => onGenerateSalesOrder?.(getCurrentBillingData())}
                    disabled={!customer || items.length === 0}
                    className="w-full"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Create Sales Order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
