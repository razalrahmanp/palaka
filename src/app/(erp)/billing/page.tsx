"use client";

import React, { useState } from "react";
import { InvoiceBillingDashboard } from "@/components/billing/InvoiceBillingDashboard";
import { BillingData } from "@/types";
import { toast } from "sonner";

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
        type: item.isCustom ? 'new' : 'product',
        // Additional fields for custom items
        ...(item.isCustom && {
          image_url: null,
          discount_percentage: item.discountPercentage || 0,
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
      }));

      // Check if EMI payment is selected
      const emiPayment = data.paymentMethods?.find(pm => pm.type === 'emi');
      const hasBajajFinance = emiPayment !== undefined;

      // Calculate EMI plan if Bajaj Finance is selected
      let emiPlan = null;
      let monthlyEmiAmount = 0;

      if (hasBajajFinance) {
        const totalAmount = data.finalTotal;
        const isNewCustomer = true; // Default to new customer
        const newCustomerFee = isNewCustomer ? 530 : 0;
        const totalAmountWithFee = totalAmount + newCustomerFee;

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
          discount_amount: data.totals.discount_amount,
          freight_charges: data.totals.freight_charges,
          notes: data.notes,
          status: 'Converted', // Set as Converted immediately
          created_by: data.selectedSalesman?.user_id || null,
          emi_enabled: hasBajajFinance,
          emi_plan: emiPlan,
          emi_monthly: monthlyEmiAmount,
          bajaj_finance_amount: hasBajajFinance ? data.finalTotal + (emiPlan?.newCustomerFee || 0) : 0,
          bajaj_approved_amount: hasBajajFinance ? data.finalTotal + (emiPlan?.newCustomerFee || 0) : null
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
          bajaj_approved_amount: createdQuote.emi_enabled ? createdQuote.bajaj_finance_amount : null
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
    <InvoiceBillingDashboard
      onSave={handleSave}
      onCreateQuoteAndSalesOrder={handleCreateQuoteAndSalesOrder}
      isProcessing={isProcessing}
      quoteGenerated={!!generatedQuote}
      quoteStatus={quoteStatus}
    />
  );
}
