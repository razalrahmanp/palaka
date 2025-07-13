"use client";
import React, { useState, useEffect } from "react";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import { InvoicesTable } from "@/components/finance/InvoicesTable";
import { InvoiceDialog } from "@/components/finance/InvoiceDialog";
import { ExpensesTable } from "@/components/finance/ExpensesTable";
import { CashFlowDashboard } from "@/components/finance/CashFlowDashboard";
import { BankAccountsTable } from "@/components/finance/BankAccountsTables";
import { PaymentsTable } from "@/components/finance/PaymentsTable";
import { PurchaseOrdersTable } from "@/components/finance/PurchaseOrdersTable";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Invoice, Payment, FinPurchaseOrder } from "@/types";
import { PurchaseOrderDialog } from "@/components/finance/PurchaseOrderDialogue";
import { PaymentDialog } from "@/components/finance/PaymentDialog";

export default function FinancePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editOrder, setEditOrder] = useState<FinPurchaseOrder | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<FinPurchaseOrder[]>([]);

  const fetchInvoices = async () => {
    const res = await fetch("/api/finance/invoices");
    const { data } = await res.json();
    setInvoices(data as Invoice[]);
  };

  const fetchPayments = async () => {
    const res = await fetch("/api/finance/payments");
    const { data } = await res.json();
    setPayments(data as Payment[]);
  };

  const fetchPurchaseOrders = async () => {
    const res = await fetch("/api/finance/purchase-order");
    const { data } = await res.json();
    setPurchaseOrders(data as FinPurchaseOrder[]);
  };

  useEffect(() => {
    fetchInvoices();
    fetchPayments();
    fetchPurchaseOrders();
  }, []);

  const totalReceivables = invoices.reduce(
    (sum, i) => sum + (i.total - i.paid_amount),
    0
  );
  const totalPayments = invoices.reduce((sum, i) => sum + i.paid_amount, 0);
  const totalPayables = purchaseOrders.reduce((sum, po) => {
  const unpaid = (po.total ?? 0) - (po.paid_amount ?? 0);
  return sum + (unpaid > 0 ? unpaid : 0);
}, 0);

  return (
    <div className="p-4 space-y-4">
      <FinanceDashboard
        receivables={totalReceivables}
        payables={totalPayables }
        totalPayments={totalPayments}
      />

      <Tabs defaultValue="invoices">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="purchase-order">Purchase Orders</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="cashflow">Cashflow</TabsTrigger>
          <TabsTrigger value="bank_accounts">Bank Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <div className="flex justify-between mb-2">
            <Button onClick={() => { setEditInvoice(null); setDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Invoice
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const csv = invoices.map(i => `${i.id},${i.customer_name},${i.status},${i.total},${i.paid_amount}`).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "invoices.csv";
                a.click();
              }}
            >
              Export CSV
            </Button>
          </div>
          <InvoicesTable
            invoices={invoices}
            onEdit={(inv) => { setEditInvoice(inv); setDialogOpen(true); }}
            onDelete={async (id) => {
              if (confirm("Delete invoice?")) {
                await fetch("/api/finance/invoices", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id }),
                });
                fetchInvoices();
              }
            }}
          />
          <InvoiceDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            initialData={editInvoice}
            onSave={async (data) => {
              await fetch("/api/finance/invoices", {
                method: editInvoice ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editInvoice ? { ...data, id: editInvoice.id } : data),
              });
              fetchInvoices();
              setDialogOpen(false);
            }}
          />
        </TabsContent>

        <TabsContent value="payments">
          <div className="flex justify-end mb-2">
            <Button onClick={() => { setEditPayment(null); setPaymentDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Payment
            </Button>
          </div>
          <PaymentsTable
            payments={payments}
            onEdit={(payment) => { setEditPayment(payment); setPaymentDialogOpen(true); }}
            onDelete={async (id) => {
              if (confirm("Delete payment?")) {
                await fetch("/api/finance/payments", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id }),
                });
                fetchPayments();
                fetchInvoices();
              }
            }}
          />
          <PaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            initialData={editPayment}
            onSave={async (data) => {
              await fetch("/api/finance/payments", {
                method: editPayment ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              setPaymentDialogOpen(false);
              setEditPayment(null);
              fetchPayments();
              fetchInvoices();
            }}
          />
        </TabsContent>

        <TabsContent value="purchase-order">
          <PurchaseOrdersTable
            orders={purchaseOrders}
            onEdit={(order) => setEditOrder(order)}
            onDelete={async (id) => {
              if (confirm("Delete purchase order?")) {
                await fetch("/api/finance/purchase-order", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id }),
                });
                fetchPurchaseOrders();
              }
            }}
            onRefresh={fetchPurchaseOrders}
          />
          <PurchaseOrderDialog
            open={!!editOrder}
            onOpenChange={(open) => { if (!open) setEditOrder(null); }}
            initialData={editOrder}
            onSave={async (updatedData) => {
              if (!editOrder) return;
              await fetch("/api/finance/purchase-order", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: editOrder.id,
                  status: updatedData.status,
                  total: updatedData.total,
                  due_date: updatedData.due_date,
                  paid_amount: updatedData.paid_amount,
                  payment_status: updatedData.payment_status,
                  bank_account_id: updatedData.bank_account_id,
                }),
              });
              setEditOrder(null);
              fetchPurchaseOrders();
            }}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTable />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlowDashboard />
        </TabsContent>

        <TabsContent value="bank_accounts">
          <BankAccountsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
