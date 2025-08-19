// WhatsApp API Service for sending bills
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface WhatsAppBillData {
  customerName: string;
  customerPhone: string;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  companyName: string;
  companyPhone?: string;
  companyAddress?: string;
  // Payment information
  paymentInfo?: {
    totalPaid: number;
    balanceDue: number;
    paymentStatus: string;
    lastPaymentDate?: string;
    paymentCount: number;
  };
}

export class WhatsAppService {
  private static readonly API_URL = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || '';
  private static readonly API_KEY = process.env.NEXT_PUBLIC_WHATSAPP_API_KEY || '';

  static formatBillMessage(billData: WhatsAppBillData): string {
    const { 
      customerName, 
      orderNumber, 
      items, 
      subtotal, 
      tax = 0, 
      discount = 0, 
      total,
      companyName,
      companyPhone,
      companyAddress 
    } = billData;

    let message = `*${companyName}*\n`;
    message += `📋 *INVOICE*\n`;
    message += `─────────────────────\n\n`;
    
    message += `👤 *Customer:* ${customerName}\n`;
    message += `📄 *Order #:* ${orderNumber}\n`;
    message += `📅 *Date:* ${new Date().toLocaleDateString('en-IN')}\n\n`;
    
    message += `🛍️ *Items:*\n`;
    message += `─────────────────────\n`;
    
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name}\n`;
      message += `   Qty: ${item.quantity} × ₹${item.price.toLocaleString('en-IN')}\n`;
      message += `   Total: ₹${item.total.toLocaleString('en-IN')}\n\n`;
    });
    
    message += `💰 *Bill Summary:*\n`;
    message += `─────────────────────\n`;
    message += `Subtotal: ₹${subtotal.toLocaleString('en-IN')}\n`;
    
    if (discount > 0) {
      message += `Discount: -₹${discount.toLocaleString('en-IN')}\n`;
    }
    
    if (tax > 0) {
      message += `Tax: ₹${tax.toLocaleString('en-IN')}\n`;
    }
    
    message += `*Grand Total: ₹${total.toLocaleString('en-IN')}*\n\n`;
    
    message += `📞 *Contact:* ${companyPhone || 'N/A'}\n`;
    if (companyAddress) {
      message += `📍 *Address:* ${companyAddress}\n`;
    }
    
    message += `\nThank you for your business! 🙏\n`;
    message += `*${companyName}*`;
    
    return message;
  }

  static async generateInvoicePDF(billData: WhatsAppBillData): Promise<Blob> {
    // Create a temporary container for rendering HTML
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.style.fontFamily = 'Arial, sans-serif';
    
    // Generate clean invoice HTML with standard colors only
    const cleanInvoiceHTML = this.generateCleanPDFInvoice(billData);
    container.innerHTML = cleanInvoiceHTML;
    document.body.appendChild(container);

    try {
      // Convert HTML to canvas with improved settings
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        scrollX: 0,
        scrollY: 0,
        // Ignore CSS filters and modern properties that might cause issues
        ignoreElements: (element) => {
          const computed = window.getComputedStyle(element);
          // Ignore elements with modern CSS properties
          return computed.filter !== 'none' || 
                 computed.backdropFilter !== 'none' ||
                 computed.mixBlendMode !== 'normal';
        }
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Convert to blob
      const pdfBlob = pdf.output('blob');
      return pdfBlob;
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  }

  static generateCleanPDFInvoice(billData: WhatsAppBillData): string {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${billData.orderNumber}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            background: white;
            color: #000000;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
          }
          .company-name { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 8px; 
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .invoice-title { 
            font-size: 18px; 
            opacity: 0.9; 
          }
          .info-section { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 30px; 
            gap: 30px;
          }
          .info-box { 
            width: 45%; 
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .info-box h3 { 
            margin-top: 0; 
            color: #1e40af; 
            border-bottom: 2px solid #3b82f6; 
            padding-bottom: 8px; 
            margin-bottom: 15px;
            font-size: 16px;
          }
          .info-box p {
            margin-bottom: 8px;
            color: #374151;
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          .items-table th, .items-table td { 
            border: 1px solid #d1d5db; 
            padding: 15px 12px; 
            text-align: left; 
          }
          .items-table th { 
            background: #1e40af; 
            color: white;
            font-weight: bold; 
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
          }
          .items-table tbody tr:nth-child(even) {
            background: #f9fafb;
          }
          .items-table tbody tr:hover {
            background: #f3f4f6;
          }
          .items-table td.number { 
            text-align: right; 
            font-weight: 600;
          }
          .summary { 
            margin-left: auto; 
            width: 350px; 
            background: #f8fafc;
            padding: 25px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #e2e8f0;
          }
          .summary-row:last-child {
            border-bottom: none;
          }
          .summary-row.total { 
            font-weight: bold; 
            font-size: 18px; 
            border-top: 3px solid #1e40af; 
            padding-top: 15px; 
            margin-top: 10px;
            color: #1e40af;
          }
          .footer { 
            text-align: center; 
            margin-top: 50px; 
            color: #6b7280; 
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
          }
          .footer p {
            margin-bottom: 5px;
          }
          .highlight {
            color: #1e40af;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${billData.companyName}</div>
          <div class="invoice-title">SALES INVOICE</div>
        </div>
        
        <div class="info-section">
          <div class="info-box">
            <h3>Bill To:</h3>
            <p><strong class="highlight">${billData.customerName}</strong></p>
            <p>Phone: ${billData.customerPhone}</p>
          </div>
          <div class="info-box">
            <h3>Invoice Details:</h3>
            <p>Invoice #: <strong class="highlight">${billData.orderNumber}</strong></p>
            <p>Date: ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Item Description</th>
              <th style="width: 80px;">Qty</th>
              <th style="width: 120px;">Unit Price</th>
              <th style="width: 120px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${billData.items.map((item, index) => `
              <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${item.name}</td>
                <td class="number">${item.quantity}</td>
                <td class="number">₹${item.price.toLocaleString('en-IN')}</td>
                <td class="number">₹${item.total.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₹${billData.subtotal.toLocaleString('en-IN')}</span>
          </div>
          ${billData.discount && billData.discount > 0 ? `
            <div class="summary-row">
              <span>Discount:</span>
              <span style="color: #dc2626;">-₹${billData.discount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${billData.tax && billData.tax > 0 ? `
            <div class="summary-row">
              <span>Tax:</span>
              <span>₹${billData.tax.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span>Grand Total:</span>
            <span>₹${billData.total.toLocaleString('en-IN')}</span>
          </div>
          ${billData.paymentInfo ? `
            <hr style="margin: 20px 0; border: none; border-top: 2px solid #e2e8f0;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 15px;">
              <h4 style="color: #1e40af; margin-bottom: 10px; font-size: 14px;">Payment Information</h4>
              <div class="summary-row">
                <span>Total Paid:</span>
                <span style="color: #059669;">₹${billData.paymentInfo.totalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div class="summary-row">
                <span>Balance Due:</span>
                <span style="color: ${billData.paymentInfo.balanceDue > 0 ? '#dc2626' : '#059669'};">₹${billData.paymentInfo.balanceDue.toLocaleString('en-IN')}</span>
              </div>
              <div class="summary-row">
                <span>Payment Status:</span>
                <span style="color: ${billData.paymentInfo.paymentStatus === 'fully_paid' ? '#059669' : '#ea580c'};">${billData.paymentInfo.paymentStatus.replace('_', ' ').toUpperCase()}</span>
              </div>
              ${billData.paymentInfo.paymentCount > 0 ? `
                <div class="summary-row">
                  <span>Payments Made:</span>
                  <span>${billData.paymentInfo.paymentCount} payment(s)</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p><strong>Thank you for your business!</strong></p>
          ${billData.companyPhone ? `<p>Contact: ${billData.companyPhone}</p>` : ''}
          ${billData.companyAddress ? `<p>${billData.companyAddress}</p>` : ''}
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  static async sendBillAsPDF(phoneNumber: string, billData: WhatsAppBillData): Promise<{success: boolean, message: string}> {
    try {
      // Format phone number (remove +, spaces, and ensure it starts with country code)
      let formattedPhone = phoneNumber.replace(/\D/g, '');
      
      // If phone number doesn't start with country code, assume India (+91)
      if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone;
      }

      // Generate PDF
      const pdfBlob = await this.generateInvoicePDF(billData);
      
      // If no WhatsApp API is configured, download PDF and open WhatsApp web
      if (!this.API_URL || !this.API_KEY) {
        // Download the PDF
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${billData.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Open WhatsApp with message
        const message = `📄 Invoice for Order #${billData.orderNumber}\n\nDear ${billData.customerName},\n\nPlease find your invoice attached. Thank you for your business!\n\n${billData.companyName}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
        return { success: true, message: 'PDF downloaded. WhatsApp web opened - please attach the downloaded PDF manually.' };
      }

      // If WhatsApp Business API is configured, send PDF as document
      const formData = new FormData();
      formData.append('to', formattedPhone);
      formData.append('type', 'document');
      formData.append('document', pdfBlob, `Invoice_${billData.orderNumber}.pdf`);
      formData.append('caption', `📄 Invoice for Order #${billData.orderNumber}\n\nDear ${billData.customerName},\n\nThank you for your business!\n\n${billData.companyName}`);

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
        },
        body: formData,
      });

      if (response.ok) {
        return { success: true, message: 'Invoice PDF sent successfully via WhatsApp!' };
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send WhatsApp PDF');
      }
    } catch (error) {
      console.error('WhatsApp PDF send error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send WhatsApp PDF'
      };
    }
  }

  static async downloadInvoicePDF(billData: WhatsAppBillData): Promise<void> {
    try {
      const pdfBlob = await this.generateInvoicePDF(billData);
      
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${billData.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF download error:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use sendBillAsPDF instead for better user experience
   * Sends bill as text message (legacy method)
   */
  static async sendBill(phoneNumber: string, billData: WhatsAppBillData): Promise<{success: boolean, message: string}> {
    // For backward compatibility, redirect to PDF method
    return this.sendBillAsPDF(phoneNumber, billData);
  }

  static generatePrintableInvoice(billData: WhatsAppBillData): string {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${billData.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .invoice-title { font-size: 20px; color: #666; }
          .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-box { width: 45%; }
          .info-box h3 { margin-top: 0; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .items-table th { background-color: #f5f5f5; font-weight: bold; }
          .items-table td.number { text-align: right; }
          .summary { margin-left: auto; width: 300px; }
          .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .summary-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; }
          .footer { text-align: center; margin-top: 50px; color: #666; }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${billData.companyName}</div>
          <div class="invoice-title">INVOICE</div>
        </div>
        
        <div class="info-section">
          <div class="info-box">
            <h3>Bill To:</h3>
            <p><strong>${billData.customerName}</strong></p>
            <p>Phone: ${billData.customerPhone}</p>
          </div>
          <div class="info-box">
            <h3>Invoice Details:</h3>
            <p>Invoice #: <strong>${billData.orderNumber}</strong></p>
            <p>Date: ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${billData.items.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td class="number">${item.quantity}</td>
                <td class="number">₹${item.price.toLocaleString('en-IN')}</td>
                <td class="number">₹${item.total.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₹${billData.subtotal.toLocaleString('en-IN')}</span>
          </div>
          ${billData.discount && billData.discount > 0 ? `
            <div class="summary-row">
              <span>Discount:</span>
              <span>-₹${billData.discount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${billData.tax && billData.tax > 0 ? `
            <div class="summary-row">
              <span>Tax:</span>
              <span>₹${billData.tax.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span>Grand Total:</span>
            <span>₹${billData.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          ${billData.companyPhone ? `<p>Contact: ${billData.companyPhone}</p>` : ''}
          ${billData.companyAddress ? `<p>${billData.companyAddress}</p>` : ''}
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print Invoice
          </button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
            Close
          </button>
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  static printInvoice(billData: WhatsAppBillData): void {
    const html = this.generatePrintableInvoice(billData);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}
