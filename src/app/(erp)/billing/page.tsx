"use client";

import React, { useState } from "react";
import { InvoiceBillingDashboard } from "@/components/billing/InvoiceBillingDashboard";
import { BillingData } from "@/types";
import { toast } from "sonner";

export default function BillingPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<{ id: string; status: string } | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<string>('');

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

  const handleGenerateQuote = async (data: BillingData) => {
    setIsProcessing(true);
    try {
      // Implement quote generation
      console.log("Generating quote:", data);
      
      // Transform items to match API expectations
      const transformedItems = data.items.map(item => ({
        product_id: item.isCustom ? null : (item.product?.product_id || null),
        custom_product_id: item.isCustom ? (item.customProduct?.id || null) : null,
        name: item.isCustom ? item.customProduct?.name : item.product?.product_name,
        quantity: item.quantity,
        unit_price: item.finalPrice,
        total_price: item.totalPrice,
        supplier_name: item.isCustom ? item.customProduct?.supplier_name : item.product?.supplier_name,
        supplier_id: item.isCustom ? item.customProduct?.supplier_id : null,
        type: item.isCustom ? 'new' : 'product', // Changed from 'custom' to 'new'
        // Additional fields for quote_custom_items table
        ...(item.isCustom && {
          image_url: null,
          discount_percentage: item.discountPercentage || 0,
          base_product_name: item.customProduct?.name,
          specifications: item.customProduct?.description,
          materials: [], // Default empty array
          dimensions: null,
          finish: null,
          color: null,
          custom_instructions: item.customProduct?.description,
          estimated_delivery_days: item.customProduct?.lead_time_days || 30,
          complexity_level: 'medium', // Default complexity
          status: 'pending', // Default status
          notes: null,
          configuration: item.customProduct?.config_schema || {}
        })
      }));

      // Check if EMI payment is selected (indicates Bajaj Finance)
      const emiPayment = data.paymentMethods?.find(pm => pm.type === 'emi');
      const hasBajajFinance = emiPayment !== undefined;
      
      // Calculate EMI plan and monthly amount
      let emiPlan = null;
      let monthlyEmiAmount = 0;
      
      if (hasBajajFinance && emiPayment) {
        const totalAmount = data.finalTotal;
        
        // Check if customer has Bajaj Finserv card (defaulting to new customer for now)
        // TODO: Add UI field to capture if customer has existing Bajaj Finserv card
        const isNewCustomer = true; // Assume new customer by default
        const newCustomerFee = isNewCustomer ? 530 : 0;
        
        // Total amount including new customer fee if applicable
        const totalAmountWithFee = totalAmount + newCustomerFee;
        
        // Determine plan type (6/0 or 10/2) - you can modify this logic based on UI selection
        // For now, defaulting to 6/0 for amounts < 50000, 10/2 for higher amounts
        const planType = totalAmount < 50000 ? '6/0' : '10/2';
        
        if (planType === '6/0') {
          // 6 months EMI with 0 downpayment
          emiPlan = {
            type: '6/0',
            totalMonths: 6,
            emiMonths: 6,
            downPaymentMonths: 0,
            interestRate: 0,
            processingFee: 768,
            newCustomerFee: newCustomerFee,
            isNewCustomer: isNewCustomer
          };
          monthlyEmiAmount = Math.round(totalAmountWithFee / 6);
        } else {
          // 10/2 schema: 8 months EMI + 2 months advance downpayment
          emiPlan = {
            type: '10/2',
            totalMonths: 10,
            emiMonths: 8, // Only 8 months remaining after 2 months advance
            downPaymentMonths: 2,
            interestRate: 0,
            processingFee: 768,
            newCustomerFee: newCustomerFee,
            isNewCustomer: isNewCustomer
          };
          // Monthly EMI = (Total Amount + New Customer Fee) / 10 months
          monthlyEmiAmount = Math.round(totalAmountWithFee / 10);
        }
      }
      
      // Call quote API with all required fields
      const response = await fetch('/api/sales/quotes', {
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
          final_price: data.totals.final_price,
          discount_amount: data.totals.discount_amount,
          freight_charges: data.totals.freight_charges,
          notes: data.notes,
          status: 'draft',
          created_by: data.selectedSalesman?.user_id || null,
          emi_enabled: hasBajajFinance,
          emi_plan: emiPlan,
          emi_monthly: monthlyEmiAmount,
          bajaj_finance_amount: hasBajajFinance ? data.finalTotal + (emiPlan?.newCustomerFee || 0) : 0,
          bajaj_approved_amount: hasBajajFinance ? data.finalTotal + (emiPlan?.newCustomerFee || 0) : null
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Quote generated successfully");
        console.log("Quote created:", result);
        setGeneratedQuote(result);
        setQuoteStatus('draft');
        return result; // Return the created quote
      } else {
        const errorData = await response.json();
        console.error("Quote creation failed:", errorData);
        throw new Error(errorData.error || "Failed to create quote");
      }
    } catch (error) {
      console.error("Failed to generate quote:", error);
      toast.error("Failed to generate quote");
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateInvoice = async (data: BillingData) => {
    setIsProcessing(true);
    try {
      // Implement invoice generation using billing API with quote type
      console.log("Generating invoice:", data);
      
      // Transform items to match API expectations
      const transformedItems = data.items.map(item => ({
        id: item.id,
        product: item.isCustom ? undefined : {
          product_id: item.product?.product_id || '',
          product_name: item.product?.product_name || ''
        },
        customProduct: item.isCustom ? {
          id: item.customProduct?.id || item.id,
          name: item.customProduct?.name || '',
          description: item.customProduct?.description || '',
          supplier_name: item.customProduct?.supplier_name
        } : undefined,
        quantity: item.quantity,
        originalPrice: item.originalPrice,
        finalPrice: item.finalPrice,
        discountAmount: item.discountAmount,
        discountPercentage: item.discountPercentage,
        tax: item.tax,
        totalPrice: item.totalPrice,
        isCustom: item.isCustom
      }));

      // Use totals from BillingData interface
      const totals = {
        original_price: data.totals.original_price,
        total_price: data.totals.total_price,
        final_price: data.totals.final_price,
        discount_amount: data.totals.discount_amount,
        subtotal: data.totals.subtotal,
        tax: data.totals.tax,
        freight_charges: data.totals.freight_charges
      };

      // Validate customer data
      if (!data.customer) {
        throw new Error("Customer is required for invoice generation");
      }

      const customerPayload = {
        customer_id: data.customer?.customer_id || data.customer?.id,
        full_name: data.customer?.full_name || data.customer?.name,
        phone: data.customer?.phone,
        email: data.customer?.email,
        address: data.customer?.address
      };

      // Validate customer payload
      if (!customerPayload.customer_id || !customerPayload.full_name) {
        throw new Error("Customer ID and name are required");
      }

      // Validate items
      if (transformedItems.length === 0) {
        throw new Error("At least one item is required for invoice generation");
      }

      // Check if EMI payment is selected (indicates Bajaj Finance)
      const emiPayment = data.paymentMethods?.find(pm => pm.type === 'emi');
      const hasBajajFinance = emiPayment !== undefined;

      // Log data for debugging
      console.log("BillingData received:", data);
      console.log("TransformedItems:", transformedItems);
      console.log("Regular items:", transformedItems.filter(item => !item.isCustom));
      console.log("Custom items:", transformedItems.filter(item => item.isCustom));
      console.log("Customer payload:", customerPayload);

      // Call invoice/billing API with quote type
      const response = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerPayload,
          items: transformedItems.filter(item => !item.isCustom),
          customItems: transformedItems.filter(item => item.isCustom),
          totals: totals,
          paymentMethod: data.paymentMethods?.[0]?.type || 'cash',
          billingType: 'quote', // Creating as quote first, then can convert to invoice
          bajajFinanceData: hasBajajFinance ? {
            orderAmount: data.finalTotal,
            financeAmount: emiPayment?.amount || 0,
            downPayment: data.paymentMethods?.find(pm => pm.reference === 'Down Payment')?.amount || 0,
            plan: { months: 12, interestRate: 15, processingFee: 599, minAmount: 20000 }, // Default plan
            monthlyEMI: emiPayment?.amount || 0,
            totalAmount: emiPayment?.amount || 0,
            totalInterest: 0,
            processingFee: 599
          } : undefined,
          notes: data.notes
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Invoice/Quote generated successfully");
        console.log("Invoice/Quote created:", result);
      } else {
        const errorData = await response.json();
        console.error("Invoice creation failed:", errorData);
        console.error("Response status:", response.status);
        console.error("Response headers:", response.headers);
        throw new Error(errorData.error || "Failed to create invoice");
      }
    } catch (error) {
      console.error("Failed to generate invoice:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSalesOrder = async (data: BillingData) => {
    if (!generatedQuote) {
      toast.error("Please generate a quote first");
      return;
    }

    setIsProcessing(true);
    try {
      // Implement sales order generation
      console.log("Generating sales order:", data);
      
      // Transform items to match API expectations
      const transformedItems = data.items.map(item => ({
        product_id: item.isCustom ? null : (item.product?.product_id || null),
        custom_product_id: item.isCustom ? (item.customProduct?.id || null) : null,
        name: item.isCustom ? item.customProduct?.name : item.product?.product_name,
        quantity: item.quantity,
        unit_price: item.finalPrice,
        total_price: item.totalPrice,
        supplier_name: item.isCustom ? item.customProduct?.supplier_name : item.product?.supplier_name,
        supplier_id: item.isCustom ? item.customProduct?.supplier_id : null,
        type: item.isCustom ? 'new' : 'product', // Changed from 'custom' to 'new'
        // Additional fields for quote_custom_items table
        ...(item.isCustom && {
          image_url: null,
          discount_percentage: item.discountPercentage || 0,
          base_product_name: item.customProduct?.name,
          specifications: item.customProduct?.description,
          materials: [], // Default empty array
          dimensions: null,
          finish: null,
          color: null,
          custom_instructions: item.customProduct?.description,
          estimated_delivery_days: item.customProduct?.lead_time_days || 30,
          complexity_level: 'medium', // Default complexity
          status: 'pending', // Default status
          notes: null,
          configuration: item.customProduct?.config_schema || {}
        })
      }));

      // Check if EMI payment is selected
      const emiPayment = data.paymentMethods?.find(pm => pm.type === 'emi');
      const hasBajajFinance = emiPayment !== undefined;
      
      // Calculate EMI plan and monthly amount based on Bajaj Finance requirements
      let emiPlan = null;
      let monthlyEmiAmount = 0;
      
      if (hasBajajFinance) {
        const totalAmount = data.finalTotal;
        
        // Check if customer has Bajaj Finserv card (defaulting to new customer for now)
        // TODO: Add UI field to capture if customer has existing Bajaj Finserv card
        const isNewCustomer = true; // Assume new customer by default
        const newCustomerFee = isNewCustomer ? 530 : 0;
        
        // Total amount including new customer fee if applicable
        const totalAmountWithFee = totalAmount + newCustomerFee;
        
        // 6/0 plan for amounts less than 50,000
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
          // 10/2 plan for amounts 50,000 and above
          // Customer pays 2 months EMI in advance, then 8 remaining monthly EMIs
          emiPlan = {
            type: "10/2",
            totalMonths: 10,
            emiMonths: 8, // Only 8 months remaining after 2 months advance
            downPaymentMonths: 2,
            interestRate: 0,
            processingFee: 0,
            newCustomerFee: newCustomerFee,
            isNewCustomer: isNewCustomer
          };
          // Monthly EMI = (Total Amount + New Customer Fee) / 10 months
          monthlyEmiAmount = Math.round(totalAmountWithFee / 10);
        }
      }
      
      // Call sales order API
      const response = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote_id: generatedQuote.id,
          customer_id: data.customer?.customer_id || data.customer?.id,
          customer: data.customer?.name,
          items: transformedItems,
          total_price: data.finalTotal,
          original_price: data.totals.original_price,
          final_price: data.totals.final_price,
          discount_amount: data.totals.discount_amount,
          freight_charges: data.totals.freight_charges,
          delivery_date: data.deliveryDate,
          payment_methods: data.paymentMethods,
          notes: data.notes,
          status: 'draft',
          created_by: data.selectedSalesman?.user_id || null,
          emi_enabled: hasBajajFinance,
          emi_plan: emiPlan,
          emi_monthly: monthlyEmiAmount,
          bajaj_finance_amount: hasBajajFinance ? data.finalTotal + (emiPlan?.newCustomerFee || 0) : 0,
          bajaj_approved_amount: hasBajajFinance ? data.finalTotal + (emiPlan?.newCustomerFee || 0) : null
        }),
      });

      if (response.ok) {
        // Update quote status to converted
        const updateQuoteResponse = await fetch(`/api/sales/quotes/${generatedQuote.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'converted'
          }),
        });

        if (updateQuoteResponse.ok) {
          const result = await response.json();
          toast.success("Sales order created successfully");
          console.log("Sales order created:", result);
          setQuoteStatus('converted');
        } else {
          toast.error("Failed to update quote status");
        }
      } else {
        const errorData = await response.json();
        console.error("Sales order creation failed:", errorData);
        throw new Error(errorData.error || "Failed to create sales order");
      }
    } catch (error) {
      console.error("Failed to create sales order:", error);
      toast.error("Failed to create sales order");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <InvoiceBillingDashboard
      onSave={handleSave}
      onGenerateQuote={handleGenerateQuote}
      onGenerateInvoice={handleGenerateInvoice}
      onGenerateSalesOrder={handleGenerateSalesOrder}
      isProcessing={isProcessing}
      quoteGenerated={!!generatedQuote}
      quoteStatus={quoteStatus}
    />
  );
}
