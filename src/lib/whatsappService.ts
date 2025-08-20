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
      companyAddress,
      paymentInfo
    } = billData;

    let message = `*${companyName}*\n`;
    message += `📋 *ESTIMATE DETAILS*\n`;
    message += `═══════════════════════\n\n`;
    
    message += `👤 *Customer:* ${customerName}\n`;
    message += `📄 *Order #:* ${orderNumber}\n`;
    message += `📅 *Date:* ${new Date().toLocaleDateString('en-IN')}\n\n`;
    
    message += `🛍️ *ITEMS ORDERED:*\n`;
    message += `─────────────────────\n`;
    
    items.forEach((item, index) => {
      message += `${index + 1}. *${item.name}*\n`;
      message += `   Qty: ${item.quantity} × ₹${item.price.toLocaleString('en-IN')}\n`;
      message += `   Subtotal: ₹${item.total.toLocaleString('en-IN')}\n\n`;
    });
    
    message += `💰 *BILLING SUMMARY:*\n`;
    message += `─────────────────────\n`;
    message += `Subtotal: ₹${subtotal.toLocaleString('en-IN')}\n`;
    
    if (discount > 0) {
      message += `Discount: -₹${discount.toLocaleString('en-IN')}\n`;
    }
    
    if (tax > 0) {
      message += `Tax/GST: ₹${tax.toLocaleString('en-IN')}\n`;
    }
    
    message += `*GRAND TOTAL: ₹${total.toLocaleString('en-IN')}*\n\n`;
    
    // Add payment information if available
    if (paymentInfo) {
      message += `💳 *PAYMENT STATUS:*\n`;
      message += `─────────────────────\n`;
      message += `Total Amount: ₹${total.toLocaleString('en-IN')}\n`;
      message += `Amount Paid: ₹${paymentInfo.totalPaid.toLocaleString('en-IN')}\n`;
      message += `Balance Due: ₹${paymentInfo.balanceDue.toLocaleString('en-IN')}\n`;
      message += `Status: *${paymentInfo.paymentStatus}*\n`;
      
      if (paymentInfo.lastPaymentDate) {
        message += `Last Payment: ${new Date(paymentInfo.lastPaymentDate).toLocaleDateString('en-IN')}\n`;
      }
      
      if (paymentInfo.paymentCount > 0) {
        message += `Payments Made: ${paymentInfo.paymentCount}\n`;
      }
      
      message += `\n`;
    }
    
    message += `📞 *CONTACT INFO:*\n`;
    message += `─────────────────────\n`;
    message += `Phone: ${companyPhone || 'N/A'}\n`;
    if (companyAddress) {
      message += `Address: ${companyAddress}\n`;
    }
    message += `Website: www.alramsfurnitures.com\n`;
    
    message += `\n🙏 *Thank you for choosing ${companyName}!*\n`;
    message += `We appreciate your business and look forward to serving you again.\n\n`;
    message += `*${companyName}* - Your Trusted Furniture Partner`;
    
    return message;
  }

  static async generateInvoicePDF(billData: WhatsAppBillData): Promise<Blob> {
    try {
      return await this.generateInvoicePDFWithCanvas(billData);
    } catch (error) {
      console.warn('Canvas-based PDF generation failed, falling back to simple PDF:', error);
      return this.generateSimplePDF(billData);
    }
  }

  static async generateInvoicePDFWithCanvas(billData: WhatsAppBillData): Promise<Blob> {
    // Create a temporary container for rendering HTML
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '800px';
    container.style.background = '#ffffff';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.isolation = 'isolate'; // Prevent color inheritance
    
    // Generate clean invoice HTML with standard colors only
    const cleanInvoiceHTML = this.generateCleanPDFInvoice(billData);
    container.innerHTML = cleanInvoiceHTML;
    document.body.appendChild(container);

    try {
      // Convert HTML to canvas with improved settings to avoid OKLCH issues
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false, // Disable foreign object rendering to avoid modern CSS issues
        // Ignore CSS filters and modern properties that might cause issues
        ignoreElements: (element) => {
          const computed = window.getComputedStyle(element);
          // Ignore elements with modern CSS properties or complex colors
          return computed.filter !== 'none' || 
                 computed.backdropFilter !== 'none' ||
                 computed.mixBlendMode !== 'normal' ||
                 computed.color.includes('oklch') ||
                 computed.backgroundColor.includes('oklch') ||
                 computed.borderColor.includes('oklch');
        },
        onclone: (clonedDoc) => {
          // Force standard colors on cloned document to avoid OKLCH issues
          const clonedContainer = clonedDoc.querySelector('div');
          if (clonedContainer) {
            // Override any potential modern color functions
            clonedContainer.style.setProperty('color', '#000000', 'important');
            clonedContainer.style.setProperty('background-color', '#ffffff', 'important');
            
            // Force all child elements to use standard colors
            const allElements = clonedContainer.querySelectorAll('*');
            allElements.forEach((el: Element) => {
              const htmlEl = el as HTMLElement;
              // Reset any potential OKLCH colors to standard equivalents
              if (htmlEl.style.color && htmlEl.style.color.includes('oklch')) {
                htmlEl.style.color = '#000000';
              }
              if (htmlEl.style.backgroundColor && htmlEl.style.backgroundColor.includes('oklch')) {
                htmlEl.style.backgroundColor = '#ffffff';
              }
              if (htmlEl.style.borderColor && htmlEl.style.borderColor.includes('oklch')) {
                htmlEl.style.borderColor = '#e2e8f0';
              }
            });
          }
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
          * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0;
            color: inherit !important;
            background-color: transparent !important;
          }
          body { 
            font-family: Arial, sans-serif !important; 
            margin: 40px !important; 
            background: #ffffff !important;
            color: #000000 !important;
            line-height: 1.4 !important;
          }
          .header { 
            text-align: center !important; 
            border-bottom: 3px solid #2563eb !important; 
            padding-bottom: 20px !important; 
            margin-bottom: 30px !important; 
            background: #1e40af !important;
            color: #ffffff !important;
            padding: 30px !important;
            border-radius: 8px !important;
          }
          .company-name { 
            font-size: 28px !important; 
            font-weight: bold !important; 
            margin-bottom: 8px !important; 
            color: #ffffff !important;
          }
          .invoice-title { 
            font-size: 18px !important; 
            color: #f8fafc !important;
          }
          .info-section { 
            display: flex !important; 
            justify-content: space-between !important; 
            margin-bottom: 30px !important; 
            gap: 30px !important;
          }
          .info-box { 
            width: 45% !important; 
            background: #f8fafc !important;
            padding: 20px !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0 !important;
          }
          .info-box h3 { 
            margin-top: 0 !important; 
            color: #1e40af !important; 
            border-bottom: 2px solid #3b82f6 !important; 
            padding-bottom: 8px !important; 
            margin-bottom: 15px !important;
            font-size: 16px !important;
          }
          .info-box p {
            margin-bottom: 8px !important;
            color: #374151 !important;
          }
          .items-table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            margin-bottom: 30px !important; 
            background: #ffffff !important;
            border-radius: 8px !important;
            overflow: hidden !important;
          }
          .items-table th, .items-table td { 
            border: 1px solid #d1d5db !important; 
            padding: 15px 12px !important; 
            text-align: left !important; 
          }
          .items-table th { 
            background: #1e40af !important; 
            color: #ffffff !important;
            font-weight: bold !important; 
            text-transform: uppercase !important;
            font-size: 12px !important;
            letter-spacing: 0.5px !important;
          }
          .items-table tbody tr:nth-child(even) {
            background: #f9fafb !important;
          }
          .items-table tbody tr:hover {
            background: #f3f4f6 !important;
          }
          .items-table td.number { 
            text-align: right !important; 
            font-weight: 600 !important;
            color: #000000 !important;
          }
          .summary { 
            margin-left: auto !important; 
            width: 350px !important; 
            background: #f8fafc !important;
            padding: 25px !important;
            border-radius: 8px !important;
            border: 1px solid #e2e8f0 !important;
          }
          .summary-row { 
            display: flex !important; 
            justify-content: space-between !important; 
            padding: 8px 0 !important; 
            border-bottom: 1px solid #e2e8f0 !important;
            color: #000000 !important;
          }
          .summary-row:last-child {
            border-bottom: none !important;
          }
          .summary-row.total { 
            font-weight: bold !important; 
            font-size: 18px !important; 
            border-top: 3px solid #1e40af !important; 
            padding-top: 15px !important; 
            margin-top: 10px !important;
            color: #1e40af !important;
          }
          .footer { 
            text-align: center !important; 
            margin-top: 50px !important; 
            color: #6b7280 !important; 
            border-top: 2px solid #e5e7eb !important;
            padding-top: 20px !important;
          }
          .footer p {
            margin-bottom: 5px !important;
            color: #6b7280 !important;
          }
          .highlight {
            color: #1e40af !important;
            font-weight: 600 !important;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${billData.companyName}</div>
          <div class="invoice-title">ESTIMATE</div>
        </div>
        
        <div class="info-section">
          <div class="info-box">
            <h3>Bill To:</h3>
            <p><strong class="highlight">${billData.customerName}</strong></p>
            <p>Phone: ${billData.customerPhone}</p>
          </div>
          <div class="info-box">
            <h3>Estimate Details:</h3>
            <p>Estimate #: <strong class="highlight">${billData.orderNumber}</strong></p>
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
            <div style="background: #f8fafc !important; padding: 15px !important; border-radius: 6px !important; margin-top: 15px !important;">
              <h4 style="color: #1e40af !important; margin-bottom: 10px !important; font-size: 14px !important;">Payment Information</h4>
              <div class="summary-row">
                <span style="color: #000000 !important;">Total Paid:</span>
                <span style="color: #059669 !important;">₹${billData.paymentInfo.totalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div class="summary-row">
                <span style="color: #000000 !important;">Balance Due:</span>
                <span style="color: ${billData.paymentInfo.balanceDue > 0 ? '#dc2626' : '#059669'} !important;">₹${billData.paymentInfo.balanceDue.toLocaleString('en-IN')}</span>
              </div>
              <div class="summary-row">
                <span style="color: #000000 !important;">Payment Status:</span>
                <span style="color: ${billData.paymentInfo.paymentStatus === 'Paid' ? '#059669' : '#ea580c'} !important;">${billData.paymentInfo.paymentStatus.toUpperCase()}</span>
              </div>
              ${billData.paymentInfo.paymentCount > 0 ? `
                <div class="summary-row">
                  <span style="color: #000000 !important;">Payments Made:</span>
                  <span style="color: #000000 !important;">${billData.paymentInfo.paymentCount} payment(s)</span>
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
      // Validate phone number
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        return {
          success: false,
          message: 'Invalid phone number provided'
        };
      }

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
        a.download = `Estimate_${billData.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Open WhatsApp with message
        const message = `📄 Estimate for Order #${billData.orderNumber}\n\nDear ${billData.customerName},\n\nPlease find your estimate attached. Thank you for your business!\n\n${billData.companyName}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        
        return { success: true, message: 'PDF downloaded. WhatsApp web opened - please attach the downloaded PDF manually.' };
      }

      // If WhatsApp Business API is configured, send PDF as document
      const formData = new FormData();
      formData.append('to', formattedPhone);
      formData.append('type', 'document');
      formData.append('document', pdfBlob, `Estimate_${billData.orderNumber}.pdf`);
      formData.append('caption', `📄 Estimate for Order #${billData.orderNumber}\n\nDear ${billData.customerName},\n\nThank you for your business!\n\n${billData.companyName}`);

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

  /**
   * Sends bill details as formatted text message via WhatsApp
   */
  static async sendBillAsText(phoneNumber: string, billData: WhatsAppBillData): Promise<{success: boolean, message: string}> {
    try {
      // Validate phone number
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        return {
          success: false,
          message: 'Invalid phone number. Please enter a valid WhatsApp number with country code.'
        };
      }

      // Format the bill message
      const message = this.formatBillMessage(billData);
      
      // Check message length (WhatsApp URL has limitations)
      const maxLength = 2000; // Conservative limit for WhatsApp URLs
      if (message.length > maxLength) {
        // Create a shorter version if the message is too long
        const shortMessage = this.formatShortBillMessage(billData);
        const encodedMessage = encodeURIComponent(shortMessage);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        
        console.log('Message was too long, using shorter version');
        console.log('WhatsApp URL:', whatsappUrl);
        
        // Open WhatsApp in new window/tab
        window.open(whatsappUrl, '_blank');
        
        return {
          success: true,
          message: 'WhatsApp opened with simplified invoice details. Message was shortened to fit WhatsApp limits.'
        };
      }
      
      // Create WhatsApp URL with formatted message
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      
      console.log('WhatsApp URL:', whatsappUrl);
      console.log('Message length:', message.length);
      
      // Check if window.open is available (browser environment)
      if (typeof window === 'undefined' || typeof window.open !== 'function') {
        return {
          success: false,
          message: 'WhatsApp sharing is not available in this environment.'
        };
      }
      
      // Open WhatsApp in new window/tab
      const newWindow = window.open(whatsappUrl, '_blank');
      
      if (!newWindow) {
        return {
          success: false,
          message: 'Failed to open WhatsApp. Please check if popup blocker is disabled and try again.'
        };
      }
      
      return {
        success: true,
        message: 'WhatsApp opened successfully! Please send the message from WhatsApp.'
      };
    } catch (error) {
      console.error('Error sending WhatsApp text:', error);
      return {
        success: false,
        message: `Failed to open WhatsApp: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Creates a shorter version of the bill message for WhatsApp URL limits
   */
  static formatShortBillMessage(billData: WhatsAppBillData): string {
    const { 
      customerName, 
      orderNumber, 
      items, 
      total,
      companyName,
      companyPhone,
      paymentInfo
    } = billData;

    let message = `*${companyName}*\n📋 *INVOICE*\n\n`;
    
    message += `👤 *Customer:* ${customerName}\n`;
    message += `📄 *Order:* ${orderNumber}\n`;
    message += `📅 *Date:* ${new Date().toLocaleDateString('en-IN')}\n\n`;
    
    // Show only first 3 items to save space
    const displayItems = items.slice(0, 3);
    message += `🛍️ *Items:*\n`;
    displayItems.forEach((item, index) => {
      message += `${index + 1}. ${item.name} (${item.quantity}x) - ₹${item.total.toLocaleString('en-IN')}\n`;
    });
    
    if (items.length > 3) {
      message += `... and ${items.length - 3} more items\n`;
    }
    
    message += `\n💰 *Total: ₹${total.toLocaleString('en-IN')}*\n\n`;
    
    if (paymentInfo && paymentInfo.balanceDue > 0) {
      message += `💳 Balance Due: ₹${paymentInfo.balanceDue.toLocaleString('en-IN')}\n\n`;
    }
    
    message += `📞 ${companyPhone}\n`;
    message += `🌐 www.alramsfurnitures.com\n`;
    message += `Thank you for choosing ${companyName}!`;
    
    return message;
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

  static generateSimplePDF(billData: WhatsAppBillData): Blob {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      let currentY = margin;
      const lineHeight = 7;
      const pageWidth = 210;

      // Header
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('INVOICE', margin, currentY);
      currentY += lineHeight * 2;

      // Invoice details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Order #: ${billData.orderNumber}`, margin, currentY);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, currentY);
      currentY += lineHeight;

      // Customer details
      currentY += lineHeight;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bill To:', margin, currentY);
      currentY += lineHeight;
      pdf.setFont('helvetica', 'normal');
      pdf.text(billData.customerName, margin, currentY);
      currentY += lineHeight;
      if (billData.customerPhone) {
        pdf.text(`Phone: ${billData.customerPhone}`, margin, currentY);
        currentY += lineHeight;
      }

      // Items table header
      currentY += lineHeight;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Description', margin, currentY);
      pdf.text('Qty', margin + 100, currentY);
      pdf.text('Rate', margin + 120, currentY);
      pdf.text('Amount', margin + 150, currentY);
      currentY += lineHeight;

      // Items
      pdf.setFont('helvetica', 'normal');
      billData.items.forEach(item => {
        pdf.text(item.name, margin, currentY);
        pdf.text(item.quantity.toString(), margin + 100, currentY);
        pdf.text(`$${item.price.toFixed(2)}`, margin + 120, currentY);
        pdf.text(`$${item.total.toFixed(2)}`, margin + 150, currentY);
        currentY += lineHeight;
      });

      // Totals
      currentY += lineHeight;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Subtotal: $${billData.subtotal.toFixed(2)}`, margin + 120, currentY);
      currentY += lineHeight;
      if (billData.tax && billData.tax > 0) {
        pdf.text(`Tax: $${billData.tax.toFixed(2)}`, margin + 120, currentY);
        currentY += lineHeight;
      }
      pdf.text(`Total: $${billData.total.toFixed(2)}`, margin + 120, currentY);
      currentY += lineHeight * 2;

      // Payment information if available
      if (billData.paymentInfo) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Payment Information:', margin, currentY);
        currentY += lineHeight;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Total Paid: $${billData.paymentInfo.totalPaid.toFixed(2)}`, margin, currentY);
        currentY += lineHeight;
        pdf.text(`Balance Due: $${billData.paymentInfo.balanceDue.toFixed(2)}`, margin, currentY);
        currentY += lineHeight;
        pdf.text(`Status: ${billData.paymentInfo.paymentStatus}`, margin, currentY);
        currentY += lineHeight;
        
        if (billData.paymentInfo.lastPaymentDate) {
          pdf.text(`Last Payment: ${billData.paymentInfo.lastPaymentDate}`, margin, currentY);
          currentY += lineHeight;
        }
        
        pdf.text(`Payment Count: ${billData.paymentInfo.paymentCount}`, margin, currentY);
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating simple PDF:', error);
      throw error;
    }
  }
}
