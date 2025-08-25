"use client";

import React, { useEffect, useState, useCallback } from "react";
import { User, Users, Package, CreditCard, Building2, FileText } from "lucide-react";
import { ProductWithInventory } from "@/types";
import { 
  BajajFinanceCalculator,
  CustomerForm
} from "@/components/billing";
import { BillingCustomer } from "@/components/billing/CustomerForm";
import { SplitOrderManager, SplitOrder } from "@/components/billing/SplitOrderManager";
import { BillingPaymentProcessor } from "@/components/billing/BillingPaymentProcessor";

// Import BajajFinanceData type
import type { BajajFinanceData } from "@/components/billing/BajajFinanceCalculator";

// Import new workflow components
import { WorkflowHeader } from "@/components/billing/workflow/WorkflowHeader";
import { SalespersonSelection } from "@/components/billing/workflow/SalespersonSelection";
import { BillingSourceSelection } from "@/components/billing/workflow/BillingSourceSelection";
import { DocumentSelection } from "@/components/billing/workflow/DocumentSelection";
import { CustomerStep } from "@/components/billing/workflow/CustomerStep";
import { ProductSearch } from "@/components/billing/workflow/ProductSearch";
import { CartManagement } from "@/components/billing/workflow/CartManagement";
import { PaymentProcessing } from "@/components/billing/workflow/PaymentProcessing";
import { ProductCardSidebar } from "@/components/billing/workflow/ProductCardSidebar";

interface SplitOrderData {
  financeData: BajajFinanceData;
  orderData: BillingData;
}

interface PaymentData {
  payment_date: string;
  amount: number;
  method: string;
  bank_account_id: string;
  upi_account_id: string;
  reference: string;
  description: string;
}

interface CustomProduct {
  name: string;
  description?: string;
  category: string;
  price: number;
  cost: number;
  hsn_code?: string;
  tax_rate: number;
  unit?: string;
}

interface BillingItem {
  id: string;
  product?: ProductWithInventory;
  customProduct?: CustomProduct;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  totalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  tax: number;
  isCustom: boolean;
}

interface Quote {
  id: string;
  customer_id: string;
  total_price: number;
  status: string;
  created_by: string;
  created_at: string;
  customers?: {
    name: string;
    phone?: string;
  };
  users?: {
    name: string;
  };
  items?: QuoteItem[];
}

interface SalesOrder {
  id: string;
  customer_id: string;
  final_price: number;
  status: string;
  created_by: string;
  created_at: string;
  customer?: {
    name: string;
    phone?: string;
  };
  sales_representative?: {
    name: string;
  };
  items?: SalesOrderItem[];
}

interface QuoteItem {
  id: string;
  product_id?: string;
  custom_product_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount?: number;
  products?: ProductWithInventory;
  custom_products?: CustomProduct;
}

interface SalesOrderItem {
  id: string;
  product_id?: string;
  custom_product_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount?: number;
  products?: ProductWithInventory;
  custom_products?: CustomProduct;
}

interface BillingData {
  customer: BillingCustomer | null;
  items: BillingItem[];
  subtotal: number;
  discountPercentage: number;
  finalTotal: number;
  notes: string;
}

interface Salesperson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export default function BillingPage() {
  // Core Data States
  const [billingData, setBillingData] = useState<BillingData>({
    customer: null,
    items: [],
    subtotal: 0,
    discountPercentage: 0,
    finalTotal: 0,
    notes: ''
  });

  // Product Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<'sku' | 'name' | 'supplier' | 'category'>('name');
  const [searchResults, setSearchResults] = useState<ProductWithInventory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading] = useState(false);

  // Modal States
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showBajajFinance, setShowBajajFinance] = useState(false);
  const [showSplitOrder, setShowSplitOrder] = useState(false);
  const [showPaymentProcessor, setShowPaymentProcessor] = useState(false);

  // Form States
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Billing Workflow States
  const [workflowStep, setWorkflowStep] = useState<'salesperson' | 'source' | 'customer' | 'products' | 'payment' | 'finance'>('salesperson');
  const [billingSource, setBillingSource] = useState<'new' | 'quote' | 'sales_order'>('new');
  const [selectedSalespersonId, setSelectedSalespersonId] = useState("");
  const [currentStep, setCurrentStep] = useState<'search' | 'cart'>('search');
  const [taxPercentage, setTaxPercentage] = useState(18); // Default GST rate
  
  // Payment Processing States
  const [paymentType] = useState<'full' | 'partial' | 'advance'>('full');
  const [pendingSplitOrder, setPendingSplitOrder] = useState<SplitOrderData | null>(null);

  // Documents States
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [filteredSalesOrders, setFilteredSalesOrders] = useState<SalesOrder[]>([]);
  const [searchDocuments, setSearchDocuments] = useState("");
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [salespeople, setSalespeople] = useState<Salesperson[]>([]);
  
  // Selected Documents States
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<SalesOrder | null>(null);

  // Search products function
  const searchProducts = async (query: string, type: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchParams = new URLSearchParams({
        [type]: query,
        limit: '20'
      });

      const response = await fetch(`/api/products/search?${searchParams}`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.products || []);
      } else {
        console.error('Search error:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch quotes
  const fetchQuotes = useCallback(async () => {
    setIsLoadingDocuments(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'Draft,Sent,In Review,Approved');
      
      const response = await fetch(`/api/quotes?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setQuotes(data.quotes || []);
        setFilteredQuotes(data.quotes || []);
      } else {
        console.error('Error fetching quotes:', data.error);
        setQuotes([]);
        setFilteredQuotes([]);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      setQuotes([]);
      setFilteredQuotes([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, []);

  // Fetch sales orders
  const fetchSalesOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/sales/orders');
      const data = await response.json();
      
      if (response.ok) {
        setSalesOrders(data.orders || []);
        setFilteredSalesOrders(data.orders || []);
      } else {
        console.error('Error fetching sales orders:', data.error);
        setSalesOrders([]);
        setFilteredSalesOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch sales orders:', error);
      setSalesOrders([]);
      setFilteredSalesOrders([]);
    }
  }, []);

  // Fetch salespeople
  const fetchSalespeople = useCallback(async () => {
    try {
      const response = await fetch('/api/users?role=sales');
      const data = await response.json();
      
      if (response.ok) {
        setSalespeople(data || []);
      } else {
        console.error('Error fetching salespeople:', data.error);
        setSalespeople([]);
      }
    } catch (error) {
      console.error('Failed to fetch salespeople:', error);
      setSalespeople([]);
    }
  }, []);

  // Effect for search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchProducts(searchQuery, searchType);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchType]);

  // Effect for document filtering
  useEffect(() => {
    const filterDocuments = () => {
      if (billingSource === 'quote') {
        let filtered = quotes;
        
        if (searchDocuments) {
          filtered = filtered.filter(quote => 
            quote.customers?.name?.toLowerCase().includes(searchDocuments.toLowerCase()) ||
            quote.id.toLowerCase().includes(searchDocuments.toLowerCase()) ||
            quote.customers?.phone?.includes(searchDocuments)
          );
        }
        
        setFilteredQuotes(filtered);
      } else if (billingSource === 'sales_order') {
        let filtered = salesOrders;
        
        if (searchDocuments) {
          filtered = filtered.filter(order => 
            order.customer?.name?.toLowerCase().includes(searchDocuments.toLowerCase()) ||
            order.id.toLowerCase().includes(searchDocuments.toLowerCase()) ||
            order.customer?.phone?.includes(searchDocuments)
          );
        }
        
        setFilteredSalesOrders(filtered);
      }
    };

    filterDocuments();
  }, [searchDocuments, quotes, salesOrders, billingSource]);

  // Initialize data
  useEffect(() => {
    fetchSalespeople();
  }, [fetchSalespeople]);

  // Handle product selection
  const handleProductSelect = (product: ProductWithInventory) => {
    const newItem: BillingItem = {
      id: Date.now().toString(),
      product,
      quantity: 1,
      originalPrice: Number(product.price),
      finalPrice: Number(product.price),
      totalPrice: Number(product.price),
      discountAmount: 0,
      discountPercentage: 0,
      tax: Number(product.price) * 0.18,
      isCustom: false
    };

    setBillingData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setSearchQuery("");
    setSearchResults([]);
  };

  // Handle remove item
  const handleRemoveItem = (itemId: string) => {
    setBillingData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // Handle salesperson selection
  const handleSalespersonSelect = (salespersonId: string) => {
    setSelectedSalespersonId(salespersonId);
  };

  // Handle billing source selection
  const handleBillingSourceSelect = (source: 'new' | 'quote' | 'sales_order') => {
    setBillingSource(source);
    if (source === 'quote') {
      fetchQuotes();
    } else if (source === 'sales_order') {
      fetchSalesOrders();
    }
  };

  // Handle quote selection
  const handleQuoteSelect = async (quote: Quote) => {
    // Set selected quote
    setSelectedQuote(quote);
    
    // Load quote details and items
    try {
      const response = await fetch(`/api/quotes/${quote.id}`);
      const data = await response.json();
      
      if (response.ok && data.quote) {
        const quoteData = data.quote;
        
        // Set customer
        if (quoteData.customers) {
          setBillingData(prev => ({
            ...prev,
            customer: {
              id: quoteData.customer_id,
              name: quoteData.customers.name,
              phone: quoteData.customers.phone || '',
              email: quoteData.customers.email || '',
              address: quoteData.customers.address || ''
            }
          }));
        }
        
        // Convert quote items to billing items
        if (quoteData.items && quoteData.items.length > 0) {
          const billingItems: BillingItem[] = quoteData.items.map((item: QuoteItem, index: number) => ({
            id: `quote-${item.id}-${index}`,
            product: item.products,
            customProduct: item.custom_products,
            quantity: item.quantity,
            originalPrice: Number(item.unit_price),
            finalPrice: Number(item.unit_price),
            totalPrice: Number(item.total_price),
            discountAmount: Number(item.discount || 0),
            discountPercentage: item.discount ? (Number(item.discount) / Number(item.unit_price)) * 100 : 0,
            tax: Number(item.total_price) * 0.18,
            isCustom: !!item.custom_product_id
          }));
          
          setBillingData(prev => ({
            ...prev,
            items: billingItems,
            subtotal: billingItems.reduce((sum, item) => sum + item.totalPrice, 0),
            finalTotal: Number(quoteData.total_price)
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load quote details:', error);
    }
  };

  // Handle sales order selection
  const handleSalesOrderSelect = async (salesOrder: SalesOrder) => {
    // Set selected sales order
    setSelectedSalesOrder(salesOrder);
    
    // Load sales order details and items
    try {
      const response = await fetch(`/api/sales/orders/${salesOrder.id}`);
      const data = await response.json();
      
      if (response.ok && data.order) {
        const orderData = data.order;
        
        // Set customer
        if (orderData.customer) {
          setBillingData(prev => ({
            ...prev,
            customer: {
              id: orderData.customer_id,
              name: orderData.customer.name,
              phone: orderData.customer.phone || '',
              email: orderData.customer.email || '',
              address: orderData.customer.address || ''
            }
          }));
        }
        
        // Convert order items to billing items
        if (orderData.items && orderData.items.length > 0) {
          const billingItems: BillingItem[] = orderData.items.map((item: SalesOrderItem, index: number) => ({
            id: `order-${item.id}-${index}`,
            product: item.products,
            customProduct: item.custom_products,
            quantity: item.quantity,
            originalPrice: Number(item.unit_price),
            finalPrice: Number(item.unit_price),
            totalPrice: Number(item.total_price),
            discountAmount: Number(item.discount || 0),
            discountPercentage: item.discount ? (Number(item.discount) / Number(item.unit_price)) * 100 : 0,
            tax: Number(item.total_price) * 0.18,
            isCustom: !!item.custom_product_id
          }));
          
          setBillingData(prev => ({
            ...prev,
            items: billingItems,
            subtotal: billingItems.reduce((sum, item) => sum + item.totalPrice, 0),
            finalTotal: Number(orderData.final_price)
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load sales order details:', error);
    }
  };

  // Handle clearing selected document
  const handleClearSelection = () => {
    setSelectedQuote(null);
    setSelectedSalesOrder(null);
    // Reset billing data to initial state
    setBillingData({
      customer: null,
      items: [],
      subtotal: 0,
      discountPercentage: 0,
      finalTotal: 0,
      notes: ''
    });
  };

  // Handle Bajaj finance
  const handleBajajFinanceSelect = (financeData: BajajFinanceData) => {
    // Implementation for Bajaj finance
    console.log('Bajaj finance selected:', financeData);
  };

  // Handle split order
  const handleSplitOrderConfirm = (splitOrder: SplitOrder) => {
    // Implementation for split orders
    console.log('Split order confirmed:', splitOrder);
  };

  // Handle payment success
  const handlePaymentSuccess = (paymentData: PaymentData) => {
    // Implementation for payment success
    console.log('Payment successful:', paymentData);
  };

  // Process billing
  const processBilling = async () => {
    setIsProcessing(true);
    try {
      // Implementation for processing billing
      console.log('Processing billing:', billingData);
      
      // Reset after successful processing
      setBillingData({
        customer: null,
        items: [],
        subtotal: 0,
        discountPercentage: 0,
        finalTotal: 0,
        notes: ''
      });
      setWorkflowStep('salesperson');
    } catch (error) {
      console.error('Billing processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset billing data
  const resetBillingData = () => {
    setBillingData({
      customer: null,
      items: [],
      subtotal: 0,
      discountPercentage: 0,
      finalTotal: 0,
      notes: ''
    });
    setSelectedSalespersonId("");
    setCurrentStep('search');
  };

  // Workflow step management
  const workflowSteps = [
    { key: 'salesperson', label: 'Salesperson', icon: <User className="h-5 w-5" />, description: 'Select sales representative' },
    { key: 'source', label: 'Source', icon: <FileText className="h-5 w-5" />, description: 'Choose billing source' },
    { key: 'customer', label: 'Customer', icon: <Users className="h-5 w-5" />, description: 'Select or add customer' },
    { key: 'products', label: 'Products', icon: <Package className="h-5 w-5" />, description: 'Add products to cart' },
    { key: 'payment', label: 'Payment', icon: <CreditCard className="h-5 w-5" />, description: 'Process payment' },
    { key: 'finance', label: 'Finance', icon: <Building2 className="h-5 w-5" />, description: 'Optional EMI setup' }
  ];

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.key === workflowStep);
  };

  const goToNextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < workflowSteps.length - 1) {
      setWorkflowStep(workflowSteps[currentIndex + 1].key as 'salesperson' | 'source' | 'customer' | 'products' | 'payment' | 'finance');
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setWorkflowStep(workflowSteps[currentIndex - 1].key as 'salesperson' | 'source' | 'customer' | 'products' | 'payment' | 'finance');
    }
  };

  const renderWorkflowStep = () => {
    switch (workflowStep) {
      case 'salesperson':
        return (
          <SalespersonSelection
            selectedSalespersonId={selectedSalespersonId}
            salespeople={salespeople}
            isLoading={isLoading}
            onSalespersonSelect={handleSalespersonSelect}
            onNext={goToNextStep}
          />
        );

      case 'source':
        return (
          <BillingSourceSelection
            selectedSource={billingSource}
            onSourceSelect={handleBillingSourceSelect}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
            isLoading={isLoading}
          />
        );

      case 'customer':
        if (billingSource === 'new') {
          return (
            <CustomerStep
              customer={billingData.customer}
              onAddCustomer={() => setShowCustomerForm(true)}
              onEditCustomer={() => setShowCustomerForm(true)}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
              isLoading={isLoading}
            />
          );
        } else {
          return (
            <DocumentSelection
              source={billingSource}
              quotes={filteredQuotes}
              salesOrders={filteredSalesOrders}
              searchQuery={searchDocuments}
              isLoading={isLoadingDocuments}
              selectedQuote={selectedQuote}
              selectedSalesOrder={selectedSalesOrder}
              onSearchChange={setSearchDocuments}
              onQuoteSelect={handleQuoteSelect}
              onSalesOrderSelect={handleSalesOrderSelect}
              onClearSelection={handleClearSelection}
              onNext={goToNextStep}
              onBack={goToPreviousStep}
            />
          );
        }

      case 'products':
        if (currentStep === 'search') {
          return (
            <ProductSearch
              searchType={searchType}
              searchQuery={searchQuery}
              searchResults={searchResults}
              isSearching={isSearching}
              onSearchTypeChange={setSearchType}
              onSearchQueryChange={setSearchQuery}
              onProductSelect={handleProductSelect}
              onNext={() => setCurrentStep('cart')}
              onBack={goToPreviousStep}
              cartItemCount={billingData.items.length}
              isLoading={isLoading}
            />
          );
        } else {
          return (
            <CartManagement
              cartItems={billingData.items.map(item => ({
                id: item.id,
                product_id: item.product?.product_id || '',
                product_name: item.product?.product_name || item.customProduct?.name || '',
                sku: item.product?.sku || 'CUSTOM',
                price: item.originalPrice,
                quantity: item.quantity,
                custom_price: item.finalPrice !== item.originalPrice ? item.finalPrice : undefined,
                discount: item.discountPercentage,
                notes: ''
              }))}
              subtotal={billingData.subtotal}
              discountPercent={billingData.discountPercentage}
              taxPercent={taxPercentage}
              totalAmount={billingData.finalTotal}
              onQuantityChange={(itemId, quantity) => {
                setBillingData(prev => ({
                  ...prev,
                  items: prev.items.map(item => 
                    item.id === itemId 
                      ? { ...item, quantity, totalPrice: item.finalPrice * quantity }
                      : item
                  )
                }));
              }}
              onCustomPriceChange={(itemId, price) => {
                setBillingData(prev => ({
                  ...prev,
                  items: prev.items.map(item => 
                    item.id === itemId 
                      ? { ...item, finalPrice: price, totalPrice: price * item.quantity }
                      : item
                  )
                }));
              }}
              onItemDiscountChange={(itemId, discount) => {
                setBillingData(prev => ({
                  ...prev,
                  items: prev.items.map(item => {
                    if (item.id === itemId) {
                      const discountAmount = item.originalPrice * discount / 100;
                      const finalPrice = item.originalPrice - discountAmount;
                      return { 
                        ...item, 
                        discountPercentage: discount, 
                        discountAmount,
                        finalPrice,
                        totalPrice: finalPrice * item.quantity 
                      };
                    }
                    return item;
                  })
                }));
              }}
              onRemoveItem={handleRemoveItem}
              onDiscountChange={(discount) => {
                setBillingData(prev => ({ ...prev, discountPercentage: discount }));
              }}
              onTaxChange={(tax) => {
                setTaxPercentage(tax);
                // Update tax percentage and recalculate totals
                const newSubtotal = billingData.items.reduce((sum, item) => sum + item.totalPrice, 0);
                const discountAmount = newSubtotal * billingData.discountPercentage / 100;
                const taxableAmount = newSubtotal - discountAmount;
                const taxAmount = taxableAmount * tax / 100;
                const finalTotal = taxableAmount + taxAmount;
                
                setBillingData(prev => ({
                  ...prev,
                  subtotal: newSubtotal,
                  finalTotal
                }));
              }}
              onNext={goToNextStep}
              onBack={() => setCurrentStep('search')}
              isLoading={isLoading}
            />
          );
        }

      case 'payment':
        return (
          <PaymentProcessing
            totalAmount={billingData.finalTotal}
            paymentConfigurations={[]}
            selectedMethods={[]}
            enableBajajFinance={false}
            bajajSplitOrders={false}
            isProcessing={isProcessing}
            onPaymentMethodAdd={() => {}}
            onPaymentMethodRemove={() => {}}
            onPaymentConfigUpdate={() => {}}
            onBajajFinanceToggle={() => {}}
            onBajajSplitToggle={() => {}}
            onProcessPayment={processBilling}
            onBack={goToPreviousStep}
            onComplete={() => {
              setWorkflowStep('salesperson');
              resetBillingData();
            }}
            isLoading={isLoading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Workflow Header */}
        <WorkflowHeader
          currentStep={workflowStep}
          steps={workflowSteps}
        />

        {/* Main Workflow Content */}
        <div className="mt-8">
          <div className="flex">
            {/* Main Content Area */}
            <div className={`${billingData.items.length > 0 ? 'flex-1 pr-6' : 'w-full'} transition-all duration-300`}>
              {renderWorkflowStep()}
            </div>

            {/* Right Sidebar - Product Cards */}
            {billingData.items.length > 0 && (
              <ProductCardSidebar
                cartItems={billingData.items.map(item => ({
                  id: item.id,
                  product_id: item.product?.product_id || '',
                  product_name: item.product?.product_name || item.customProduct?.name || '',
                  sku: item.product?.sku || 'CUSTOM',
                  price: item.originalPrice,
                  quantity: item.quantity,
                  custom_price: item.finalPrice !== item.originalPrice ? item.finalPrice : undefined,
                  discount: item.discountPercentage,
                  image_url: item.product?.product_image_url || undefined
                }))}
                subtotal={billingData.subtotal}
                discountPercent={billingData.discountPercentage}
                taxPercent={taxPercentage}
                totalAmount={billingData.finalTotal}
                onEditItem={(itemId) => {
                  // Handle edit item
                  console.log('Edit item:', itemId);
                }}
                onRemoveItem={(itemId) => {
                  // Handle remove item
                  setBillingData(prev => ({
                    ...prev,
                    items: prev.items.filter(item => item.id !== itemId)
                  }));
                }}
              />
            )}
          </div>
        </div>

        {/* Enhanced Modals */}
        <CustomerForm
          isOpen={showCustomerForm}
          onClose={() => setShowCustomerForm(false)}
          onSubmit={(customer) => {
            setBillingData(prev => ({ ...prev, customer }));
            setShowCustomerForm(false);
            goToNextStep();
          }}
        />

        <BajajFinanceCalculator
          isOpen={showBajajFinance}
          orderAmount={billingData.finalTotal}
          customerId={billingData.customer?.id || ''}
          onClose={() => setShowBajajFinance(false)}
          onSelect={handleBajajFinanceSelect}
        />

        <SplitOrderManager
          isOpen={showSplitOrder}
          orderAmount={billingData.finalTotal}
          bajajFinanceData={pendingSplitOrder?.financeData || {} as BajajFinanceData}
          cartItems={billingData.items.map(item => ({
            id: item.id,
            name: item.product?.product_name || item.customProduct?.name || '',
            quantity: item.quantity,
            unit_price: item.originalPrice,
            product_id: item.product?.product_id,
            custom_product_id: item.customProduct ? item.id : undefined,
            configuration: {},
            supplier_id: item.product?.supplier_id || undefined,
            supplier_name: item.product?.supplier_name || undefined,
            image_url: item.product?.product_image_url || undefined,
            notes: ''
          }))}
          onClose={() => {
            setShowSplitOrder(false);
            setPendingSplitOrder(null);
          }}
          onConfirmSplit={handleSplitOrderConfirm}
        />

        <BillingPaymentProcessor
          isOpen={showPaymentProcessor}
          orderAmount={billingData.finalTotal}
          amountDue={billingData.finalTotal}
          paymentType={paymentType}
          onClose={() => setShowPaymentProcessor(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  );
}
