"use client";

import React, { useState } from "react";
import { InvoiceBillingDashboard } from "@/components/billing/InvoiceBillingDashboard";
import OrderQuoteSidebar from "@/components/OrderQuoteSidebar";
import { BillingData } from "@/types";
import { toast } from "sonner";
import { InvoiceDataLoader } from "@/services/InvoiceLoader";

interface GeneratedQuote {
  id: string;
  status: string;
  final_price: number;
  original_price: number;
  total_price: number;
  discount_amount: number;
  freight_charges: number;
  bajaj_finance_amount: number;
  emi_enabled: boolean;
  emi_plan: Record<string, unknown> | null;
  emi_monthly: number;
}

export default function BillingPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuote | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string>('');
  const [initialData, setInitialData] = useState<{
    type: 'quote' | 'order';
    data: Record<string, unknown>;
    isEditing: boolean;
    existingId: string;
    existingQuoteId?: string;
    existingStatus: string;
  } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Function to load quote data into the billing form
  const handleQuoteSelect = async (quote: {
    id: string;
    customer_id: string;
    customer?: string;
    status: string;
    created_at: string;
    final_price: number;
    original_price: number;
    discount_amount: number;
    freight_charges: number;
    tax_amount: number;
    grand_total: number;
    customers?: { name: string };
    users?: { name: string };
    emi_enabled?: boolean;
    bajaj_finance_amount?: number;
    tax_percentage?: number;
  }) => {
    console.log("Selected quote:", quote);
    setIsLoadingData(true);
    
    try {
      const loadedData = await InvoiceDataLoader.loadQuoteIntoBilling(quote.id);
      if (loadedData) {
        setInitialData(loadedData);
        toast.success(`Quote #${quote.id.slice(-8)} loaded for editing`);
      } else {
        toast.error("Failed to load quote data");
      }
    } catch (error) {
      console.error("Error loading quote:", error);
      toast.error("Failed to load quote data");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Function to load sales order data into the billing form
  const handleOrderSelect = async (order: {
    id: string;
    quote_id?: string;
    customer_id: string;
    customer?: { name: string } | null;
    sales_representative?: {
      id: string;
      name: string;
      email: string;
    } | null;
    status: string;
    date: string;
    updated_at?: string;
    expected_delivery_date?: string;
    final_price: number;
    original_price: number;
    discount_amount: number;
    freight_charges: number;
    tax_amount: number;
    grand_total: number;
    total_paid?: number;
    balance_due?: number;
    payment_status?: string;
    emi_enabled?: boolean;
    bajaj_finance_amount?: number;
  }) => {
    console.log("Selected order:", order);
    setIsLoadingData(true);
    
    try {
      const loadedData = await InvoiceDataLoader.loadSalesOrderIntoBilling(order.id);
      if (loadedData) {
        setInitialData(loadedData);
        toast.success(`Order #${order.id.slice(-8)} loaded for editing`);
      } else {
        toast.error("Failed to load order data");
      }
    } catch (error) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order data");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Reset the form to create a new quote/order
  const handleNewInvoice = () => {
    setInitialData(null);
    setGeneratedQuote(null);
    setQuoteStatus('');
    toast.info("Creating new invoice");
  };

  const handleSave = async (data: BillingData) => {
    setIsProcessing(true);
    try {
      // Implement save draft functionality
      console.log("Saving draft:", data);
      toast.success("Draft saved successfully");
    } catch (error) {
      console.error("Failed to save draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setIsProcessing(false);
    }
  };

  // Combined function to create both quote and sales order in one action
  const handleCreateQuoteAndSalesOrder = async (data: BillingData) => {
    setIsProcessing(true);
    try {
      console.log("Creating quote and sales order:", data);
      console.log("Items from billing data:", data.items.map(item => ({
        name: item.isCustom ? item.customProduct?.name : item.product?.product_name,
        originalPrice: item.originalPrice,
        finalPrice: item.finalPrice,
        discountPercentage: item.discountPercentage,
        isCustom: item.isCustom
      })));
      console.log("Billing totals breakdown:", {
        original_price: data.totals.original_price,
        final_price: data.totals.final_price,
        discount_amount: data.totals.discount_amount,
        freight_charges: data.totals.freight_charges,
        subtotal: data.totals.subtotal,
        tax: data.totals.tax,
        grandTotal: data.totals.grandTotal,
        // Calculate what discount_amount should be based on the formula
        calculated_discount: data.totals.original_price + data.totals.freight_charges - data.totals.final_price
      });

      // Transform items to match API expectations
      const transformedItems = data.items.map(item => {
        // Ensure we have the right pricing data
        const originalPrice = item.originalPrice || item.finalPrice;
        const finalPrice = item.finalPrice;
        const discountPercentage = item.discountPercentage || 0;
        
        // Validate pricing consistency
        if (discountPercentage > 0 && originalPrice === finalPrice) {
          console.warn("Pricing inconsistency detected:", {
            name: item.isCustom ? item.customProduct?.name : item.product?.product_name,
            originalPrice,
            finalPrice,
            discountPercentage,
            expectedFinalPrice: originalPrice * (1 - discountPercentage / 100)
          });
        }

        const transformedItem = {
          product_id: item.isCustom ? null : (item.product?.product_id || null),
          custom_product_id: item.isCustom ? (item.customProduct?.id || null) : null,
          name: item.isCustom ? item.customProduct?.name : item.product?.product_name,
          quantity: item.quantity,
          unit_price: originalPrice, // Use original price before discount
          final_price: finalPrice, // Keep final price after discount
          total_price: item.totalPrice,
          discount_percentage: discountPercentage, // Include discount percentage
          supplier_name: item.isCustom ? item.customProduct?.supplier_name : item.product?.supplier_name,
          supplier_id: item.isCustom ? item.customProduct?.supplier_id : null,
          type: item.isCustom ? 'new' : 'existing', // Use 'existing' for regular products
          // Additional fields for custom items
          ...(item.isCustom && {
            image_url: null,
            base_product_name: item.customProduct?.name,
            specifications: item.customProduct?.description,
            materials: [],
            dimensions: null,
            finish: null,
            color: null,
            custom_instructions: item.customProduct?.description,
            estimated_delivery_days: item.customProduct?.lead_time_days || 30,
            complexity_level: 'medium',
            status: 'pending',
            notes: null,
            configuration: item.customProduct?.config_schema || {}
          })
        };

        console.log("Transforming item:", {
          name: transformedItem.name,
          original_price: originalPrice,
          final_price: finalPrice,
          unit_price: transformedItem.unit_price,
          discount_percentage: transformedItem.discount_percentage,
          item_discount_percentage: item.discountPercentage,
          type: transformedItem.type,
          isCustom: item.isCustom
        });

        return transformedItem;
      });

      // Check if EMI payment is selected
      const emiPayment = data.paymentMethods?.find(pm => pm.type === 'emi');
      const hasBajajFinance = emiPayment !== undefined;

      // Calculate EMI plan if Bajaj Finance is selected
      let emiPlan = null;
      let monthlyEmiAmount = 0;
      let bajajCharges = null;

      if (hasBajajFinance) {
        const totalAmount = data.finalTotal;
        
        // Get card status from Bajaj Finance data if available, otherwise default to new customer
        const hasCard = data.bajajFinanceData?.hasBajajCard ?? false;
        const isNewCustomer = !hasCard; // If no card, then new customer
        
        // Try to get card fee from BajajFinanceCalculator data first, then fallback to calculation
        const newCustomerFee = data.bajajFinanceData?.additionalCharges ?? (isNewCustomer ? 530 : 0);
        const totalAmountWithFee = totalAmount + newCustomerFee;

        console.log("Bajaj Finance Card Status:", {
          hasBajajCard: hasCard,
          isNewCustomer: isNewCustomer,
          cardFee: newCustomerFee,
          cardFeeSource: data.bajajFinanceData?.additionalCharges !== undefined ? "BajajFinanceCalculator" : "fallback calculation",
          bajajFinanceDataPresent: !!data.bajajFinanceData
        });

        // Calculate Bajaj Finance charges using BajajFinanceCalculator data if available
        if (data.bajajFinanceData) {
          // Use the exact values calculated by BajajFinanceCalculator
          bajajCharges = {
            processing_fee_rate: 8.0, // Standard 8% rate
            processing_fee_amount: data.bajajFinanceData.processingFee,
            convenience_charges: data.bajajFinanceData.additionalCharges, // Card fee
            total_customer_payment: data.bajajFinanceData.grandTotal,
            merchant_receivable: totalAmount,
            card_fee: data.bajajFinanceData.additionalCharges,
            bill_amount: totalAmount
          };
        } else {
          // Fallback calculation if BajajFinanceCalculator wasn't used
          const processingFeeRate = 8.0; // 8% processing fee
          const convenienceCharges = newCustomerFee; // Card fee goes into convenience charges!
          
          // Processing fee is calculated on the original bill amount (not including card fee)
          const processingFeeAmount = Math.round((totalAmount * processingFeeRate / 100) * 100) / 100;
          
          // Total customer payment includes: bill amount + card fee + processing fee
          const totalCustomerPayment = Math.round((totalAmount + newCustomerFee + processingFeeAmount) * 100) / 100;
          
          // Merchant receives only the original bill amount
          const merchantReceivable = totalAmount;

          bajajCharges = {
            processing_fee_rate: processingFeeRate,
            processing_fee_amount: processingFeeAmount,
            convenience_charges: convenienceCharges, // Card fee stored here!
            total_customer_payment: totalCustomerPayment,
            merchant_receivable: merchantReceivable,
            card_fee: newCustomerFee, // Track card fee separately for UI display
            bill_amount: totalAmount // Track original bill amount
          };
        }

        // Use the selected plan from BajajFinanceCalculator if available, otherwise fallback to auto-selection
        if (data.bajajFinanceData?.plan) {
          // User actually used the calculator and selected a plan - use their selection!
          emiPlan = {
            type: data.bajajFinanceData.plan.code, // Use selected plan (e.g., "10/2" or "6/0")
            totalMonths: data.bajajFinanceData.plan.months,
            emiMonths: data.bajajFinanceData.plan.months - (data.bajajFinanceData.plan.downPaymentMonths || 0),
            downPaymentMonths: data.bajajFinanceData.plan.downPaymentMonths || 0,
            interestRate: 0,
            processingFee: data.bajajFinanceData.plan.processingFee || 0,
            newCustomerFee: newCustomerFee,
            isNewCustomer: isNewCustomer
          };
          // Use the EMI calculated by BajajFinanceCalculator (which is correct)
          monthlyEmiAmount = data.bajajFinanceData.monthlyEMI;
          
          console.log("Using BajajFinanceCalculator selected plan:", {
            selectedPlan: data.bajajFinanceData.plan.code,
            downPayment: data.bajajFinanceData.downPayment,
            monthlyEmi: monthlyEmiAmount,
            totalMonths: data.bajajFinanceData.plan.months,
            downPaymentMonths: data.bajajFinanceData.plan.downPaymentMonths,
            financeAmount: data.bajajFinanceData.financeAmount,
            totalCustomerPays: data.bajajFinanceData.grandTotal
          });
        } else {
          // Fallback: Auto-select plan based on order amount (old logic)
          if (totalAmount < 50000) {
            emiPlan = {
              type: "6/0",
              totalMonths: 6,
              emiMonths: 6,
              downPaymentMonths: 0,
              interestRate: 0,
              processingFee: 0,
              newCustomerFee: newCustomerFee,
              isNewCustomer: isNewCustomer
            };
            monthlyEmiAmount = Math.round(totalAmountWithFee / 6);
          } else {
            emiPlan = {
              type: "10/2",
              totalMonths: 10,
              emiMonths: 8,
              downPaymentMonths: 2,
              interestRate: 0,
              processingFee: 0,
              newCustomerFee: newCustomerFee,
              isNewCustomer: isNewCustomer
            };
            monthlyEmiAmount = Math.round(totalAmountWithFee / 10);
          }
          
          console.log("Using fallback EMI plan selection (user didn't use calculator):", {
            orderAmount: totalAmount,
            selectedPlan: emiPlan.type,
            reason: totalAmount < 50000 ? "Amount < 50k" : "Amount >= 50k"
          });
        }

        // Debug: Log Bajaj Finance charge breakdown
        console.log("Bajaj Finance Charge Breakdown:", {
          billAmount: totalAmount,
          cardFee: newCustomerFee,
          cardFeeGoesTo: "convenience_charges", // This is where card fee is stored!
          processingFeeRate: bajajCharges.processing_fee_rate + "%",
          processingFeeAmount: bajajCharges.processing_fee_amount,
          convenienceCharges: bajajCharges.convenience_charges, // Should equal cardFee
          totalCustomerPays: bajajCharges.total_customer_payment,
          merchantReceives: bajajCharges.merchant_receivable,
          emiCalculatedOn: data.bajajFinanceData?.financeAmount || totalAmountWithFee,
          monthlyEMI: monthlyEmiAmount,
          dataSource: data.bajajFinanceData ? "BajajFinanceCalculator" : "fallback",
          dataStructure: {
            processing_fee_rate: bajajCharges.processing_fee_rate,
            processing_fee_amount: bajajCharges.processing_fee_amount,
            convenience_charges: bajajCharges.convenience_charges,
            total_customer_payment: bajajCharges.total_customer_payment,
            merchant_receivable: bajajCharges.merchant_receivable
          }
        });
      }

      // Fallback: If EMI is enabled but bajajCharges is null, calculate basic charges
      if (hasBajajFinance && !bajajCharges) {
        const totalAmount = data.finalTotal;
        const hasCard = data.bajajFinanceData?.hasBajajCard ?? false;
        const newCustomerFee = hasCard ? 0 : 530;
        const processingFeeRate = 8.0;
        const processingFeeAmount = Math.round((totalAmount * processingFeeRate / 100) * 100) / 100;
        const totalCustomerPayment = Math.round((totalAmount + newCustomerFee + processingFeeAmount) * 100) / 100;
        const merchantReceivable = totalAmount;

        bajajCharges = {
          processing_fee_rate: processingFeeRate,
          processing_fee_amount: processingFeeAmount,
          convenience_charges: newCustomerFee, // Card fee stored in convenience_charges!
          total_customer_payment: totalCustomerPayment,
          merchant_receivable: merchantReceivable,
          card_fee: newCustomerFee,
          bill_amount: totalAmount
        };

        console.log("Fallback Bajaj Finance Calculation Applied:", bajajCharges);
      }

      // Debug: Log what's being sent to quotes API
      console.log("Sending to quotes API (with rounding):", {
        total_price: data.finalTotal,
        original_price: data.totals.original_price,
        final_price: data.finalTotal,
        discount_amount: data.totals.discount_amount,
        freight_charges: data.totals.freight_charges,
        raw_totals: data.totals,
        // Show rounding check
        finalTotal_rounded: Math.round(data.finalTotal * 100) / 100,
        original_rounded: Math.round(data.totals.original_price * 100) / 100
      });

      // Calculate the correct discount_amount using the mathematical formula
      const correctedDiscountAmount = data.totals.original_price + data.totals.freight_charges - data.finalTotal;
      
      console.log("Discount amount correction:", {
        billing_component_discount: data.totals.discount_amount,
        calculated_discount: correctedDiscountAmount,
        difference: correctedDiscountAmount - data.totals.discount_amount
      });

      // Step 1: Create quote with "Converted" status
      const quoteResponse = await fetch('/api/sales/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: data.customer?.customer_id || data.customer?.id,
          customer: data.customer?.name,
          items: transformedItems,
          total_price: data.finalTotal,
          original_price: data.totals.original_price,
          final_price: data.finalTotal,
          discount_amount: correctedDiscountAmount, // Use corrected discount amount
          freight_charges: data.totals.freight_charges,
          // Tax information
          tax_percentage: data.totals.tax_percentage || 18.00, // Use billing component tax percentage
          tax_amount: data.totals.tax,
          taxable_amount: data.totals.subtotal,
          grand_total: data.totals.grandTotal,
          notes: data.notes,
          status: 'Converted', // Set as Converted immediately
          created_by: data.selectedSalesman?.user_id || null,
          emi_enabled: hasBajajFinance,
          emi_plan: emiPlan,
          emi_monthly: monthlyEmiAmount,
          bajaj_finance_amount: hasBajajFinance ? (data.bajajFinanceData?.financeAmount || data.finalTotal) : 0,
          bajaj_approved_amount: hasBajajFinance ? (data.bajajFinanceData?.approvedAmount || 25000) : null,
          // New Bajaj Finance charge tracking fields
          bajaj_processing_fee_rate: hasBajajFinance ? bajajCharges?.processing_fee_rate : null,
          bajaj_processing_fee_amount: hasBajajFinance ? (bajajCharges?.processing_fee_amount ?? 0) : 0,
          bajaj_convenience_charges: hasBajajFinance ? (bajajCharges?.convenience_charges ?? 0) : 0,
          bajaj_total_customer_payment: hasBajajFinance ? (bajajCharges?.total_customer_payment ?? 0) : 0,
          bajaj_merchant_receivable: hasBajajFinance ? (bajajCharges?.merchant_receivable ?? 0) : 0
        }),
      });

      if (!quoteResponse.ok) {
        const quoteError = await quoteResponse.json();
        console.error("Quote creation failed:", quoteError);
        toast.error("Failed to create quote");
        return;
      }

      const createdQuote = await quoteResponse.json();
      console.log("Quote created:", createdQuote);

      // Debug: Log the pricing data being sent to sales order
      console.log("Sales order pricing data:", {
        total_price: createdQuote.total_price,
        original_price: createdQuote.original_price, 
        final_price: createdQuote.final_price,
        discount_amount: createdQuote.discount_amount,
        freight_charges: createdQuote.freight_charges,
        ui_finalTotal: data.finalTotal,
        ui_totals: data.totals
      });

      // Step 2: Create sales order with "Confirmed" status
      const salesOrderResponse = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: createdQuote.id,
          customer_id: data.customer?.customer_id || data.customer?.id,
          customer: data.customer?.name,
          items: transformedItems,
          total_price: createdQuote.total_price,
          original_price: createdQuote.original_price,
          final_price: createdQuote.final_price,
          discount_amount: createdQuote.discount_amount,
          freight_charges: createdQuote.freight_charges,
          // Tax information
          tax_percentage: createdQuote.tax_percentage || 18.00,
          tax_amount: createdQuote.tax_amount || data.totals.tax,
          taxable_amount: createdQuote.taxable_amount || data.totals.subtotal,
          grand_total: createdQuote.grand_total || data.totals.grandTotal,
          delivery_date: data.deliveryDate,
          delivery_floor: data.deliveryFloor,
          first_floor_awareness: data.isFirstFloorAwareness,
          payment_methods: data.paymentMethods,
          notes: data.notes,
          status: 'confirmed', // Set as Confirmed immediately
          created_by: data.selectedSalesman?.user_id || null,
          emi_enabled: createdQuote.emi_enabled,
          emi_plan: createdQuote.emi_plan,
          emi_monthly: createdQuote.emi_monthly,
          bajaj_finance_amount: createdQuote.bajaj_finance_amount,
          bajaj_approved_amount: createdQuote.bajaj_approved_amount,
          // Include new Bajaj Finance charge tracking fields
          bajaj_processing_fee_rate: createdQuote.bajaj_processing_fee_rate,
          bajaj_processing_fee_amount: createdQuote.bajaj_processing_fee_amount,
          bajaj_convenience_charges: createdQuote.bajaj_convenience_charges,
          bajaj_total_customer_payment: createdQuote.bajaj_total_customer_payment,
          bajaj_merchant_receivable: createdQuote.bajaj_merchant_receivable
        }),
      });

      if (!salesOrderResponse.ok) {
        const salesOrderError = await salesOrderResponse.json();
        console.error("Sales order creation failed:", salesOrderError);
        toast.error("Failed to create sales order");
        return;
      }

      const createdSalesOrder = await salesOrderResponse.json();
      console.log("Sales order created:", createdSalesOrder);

      // Update state
      setGeneratedQuote(createdQuote);
      setQuoteStatus('Converted');

      toast.success("Quote and Sales Order created successfully!");
      
    } catch (error) {
      console.error("Failed to create quote and sales order:", error);
      toast.error("Failed to create quote and sales order");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main Billing Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with New Invoice Button */}
        <div className="px-4 py-2 border-b bg-card flex justify-between items-center flex-shrink-0">
          <h1 className="text-xl font-semibold">Billing & Invoice Management</h1>
          <div className="flex gap-2">
            {isLoadingData && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Loading data...</span>
              </div>
            )}
            {initialData && (
              <button
                onClick={handleNewInvoice}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New Invoice
              </button>
            )}
          </div>
        </div>
        
        {/* Billing Dashboard */}
        <div className="flex-1 overflow-auto">
          <InvoiceBillingDashboard
            onSave={handleSave}
            onCreateQuoteAndSalesOrder={handleCreateQuoteAndSalesOrder}
            isProcessing={isProcessing}
            quoteGenerated={!!generatedQuote}
            quoteStatus={quoteStatus}
            initialData={initialData}
            onDataLoaded={() => {
              console.log("Data loaded into billing form");
            }}
          />
        </div>
      </div>
      
      {/* Right Sidebar */}
      <div className="border-l bg-card">
        <OrderQuoteSidebar
          onQuoteSelect={handleQuoteSelect}
          onOrderSelect={handleOrderSelect}
        />
      </div>
    </div>
  );
}
