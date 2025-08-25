"use client";

import React, { useState } from "react";
import { ProfessionalBillingDashboard } from "@/components/billing/ProfessionalBillingDashboard";
import { BillingData } from "@/types";
import { toast } from "sonner";

export default function BillingPage() {
  const [isProcessing, setIsProcessing] = useState(false);

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
      
      // Call quote API
      const response = await fetch('/api/sales/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: data.customer?.id,
          customer: data.customer?.name,
          items: data.items,
          total_price: data.finalTotal,
          notes: data.notes,
          status: 'draft',
          created_by: data.selectedSalesman?.user_id || null, // Use selected salesman's user_id
          // Add other quote-specific fields
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Quote generated successfully");
        console.log("Quote created:", result);
      } else {
        throw new Error("Failed to create quote");
      }
    } catch (error) {
      console.error("Failed to generate quote:", error);
      toast.error("Failed to generate quote");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateInvoice = async (data: BillingData) => {
    setIsProcessing(true);
    try {
      // Implement invoice generation
      console.log("Generating invoice:", data);
      
      // Call invoice/billing API
      const response = await fetch('/api/billing/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: data.customer?.id,
          items: data.items,
          total_amount: data.finalTotal,
          payment_methods: data.paymentMethods,
          notes: data.notes,
          // Add other invoice-specific fields
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Invoice generated successfully");
        console.log("Invoice created:", result);
      } else {
        throw new Error("Failed to create invoice");
      }
    } catch (error) {
      console.error("Failed to generate invoice:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateSalesOrder = async (data: BillingData) => {
    setIsProcessing(true);
    try {
      // Implement sales order generation
      console.log("Generating sales order:", data);
      
      // Call sales order API
      const response = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: data.customer?.id,
          items: data.items,
          final_price: data.finalTotal,
          notes: data.notes,
          status: 'draft',
          created_by: data.selectedSalesman?.user_id || null, // Use selected salesman's user_id
          // Add other sales order-specific fields
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Sales order created successfully");
        console.log("Sales order created:", result);
      } else {
        throw new Error("Failed to create sales order");
      }
    } catch (error) {
      console.error("Failed to create sales order:", error);
      toast.error("Failed to create sales order");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ProfessionalBillingDashboard
      onSave={handleSave}
      onGenerateQuote={handleGenerateQuote}
      onGenerateInvoice={handleGenerateInvoice}
      onGenerateSalesOrder={handleGenerateSalesOrder}
      isProcessing={isProcessing}
    />
  );
}
