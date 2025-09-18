// WhatsApp API Service for sending bills
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface WhatsAppBillData {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    // Enhanced product details
    sku?: string;
    description?: string;
    specifications?: string;
    category?: string;
    isCustomProduct?: boolean;
    customConfig?: Record<string, unknown>;
    supplierName?: string;
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
      customerAddress,
      orderNumber, 
      items, 
      subtotal, 
      tax = 0, 
      discount = 0, 
      total,
      paymentInfo
    } = billData;

    let message = `*PalakaERP*\n`;
    message += `📋 *ESTIMATE DETAILS*\n`;
    message += `═══════════════════════\n\n`;
    
    message += `👤 *Customer:* ${customerName}\n`;
    if (customerAddress) {
      message += `� *Address:* ${customerAddress}\n`;
    }
    message += `�📄 *Order #:* ${orderNumber}\n`;
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
    message += `Sales: 9645075858\n`;
    message += `Delivery: 9747141858\n`;
    message += `Service: 9074513057\n`;
    
    message += `\n🙏 *Thank you for choosing PalakaERP!*\n`;
    message += `We appreciate your business and look forward to serving you again.\n\n`;
    message += `*PalakaERP* - Your Trusted Furniture Partner`;
    
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
    console.log('Using generateInvoicePDFWithCanvas method');
    
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
      
      // Convert to blob and return for PDF download
      const pdfBlob = pdf.output('blob');
      return pdfBlob;
    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  }

  static generateCleanPDFInvoice(billData: WhatsAppBillData): string {
    console.log('🚀 PDF Generation - Using updated template v2.0', billData);
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Estimate - ${billData.orderNumber}</title>
        <style>
          * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0;
            color: #000000 !important;
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
            border: 2px solid #000000 !important; 
            padding: 20px !important; 
            margin-bottom: 30px !important; 
            background: #ffffff !important;
            color: #000000 !important;
          }
          .company-name { 
            font-size: 28px !important; 
            font-weight: bold !important; 
            margin-bottom: 8px !important; 
            color: #000000 !important;
          }
          .invoice-title { 
            font-size: 18px !important; 
            color: #000000 !important;
            font-weight: bold !important;
          }
          .info-section { 
            display: flex !important; 
            justify-content: space-between !important; 
            margin-bottom: 30px !important; 
            gap: 30px !important;
          }
          .info-box { 
            width: 45% !important; 
            background: #ffffff !important;
            padding: 20px !important;
            border: 1px solid #000000 !important;
          }
          .info-box h3 { 
            margin-top: 0 !important; 
            color: #000000 !important; 
            border-bottom: 2px solid #000000 !important; 
            padding-bottom: 8px !important; 
            margin-bottom: 15px !important;
            font-size: 16px !important;
            font-weight: bold !important;
          }
          .info-box p {
            margin-bottom: 8px !important;
            color: #000000 !important;
          }
          .items-table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            margin-bottom: 30px !important; 
            background: #ffffff !important;
          }
          .items-table th, .items-table td { 
            border: 1px solid #000000 !important; 
            padding: 15px 12px !important; 
            text-align: left !important; 
            color: #000000 !important;
          }
          .items-table th { 
            background: #ffffff !important; 
            color: #000000 !important;
            font-weight: bold !important; 
            text-transform: uppercase !important;
            font-size: 12px !important;
            letter-spacing: 0.5px !important;
            border: 2px solid #000000 !important;
          }
          .items-table td.number { 
            text-align: right !important; 
            font-weight: 600 !important;
            color: #000000 !important;
          }
          .summary { 
            margin-left: auto !important; 
            width: 350px !important; 
            background: #ffffff !important;
            padding: 25px !important;
            border: 2px solid #000000 !important;
          }
          .summary-row { 
            display: flex !important; 
            justify-content: space-between !important; 
            padding: 8px 0 !important; 
            border-bottom: 1px solid #000000 !important;
            color: #000000 !important;
          }
          .summary-row:last-child {
            border-bottom: none !important;
          }
          .summary-row.total { 
            font-weight: bold !important; 
            font-size: 18px !important; 
            border-top: 3px solid #000000 !important; 
            padding-top: 15px !important; 
            margin-top: 10px !important;
            color: #000000 !important;
          }
          .footer { 
            text-align: center !important; 
            margin-top: 50px !important; 
            color: #000000 !important; 
            border-top: 2px solid #000000 !important;
            padding-top: 20px !important;
          }
          .footer p {
            margin-bottom: 5px !important;
            color: #000000 !important;
          }
          .highlight {
            color: #000000 !important;
            font-weight: 600 !important;
          }
          /* Remove all color classes */
          .text-blue-600, .text-blue-700, .text-blue-800, .text-blue-900,
          .bg-blue-50, .bg-blue-100, .bg-blue-500, .bg-blue-600, .bg-blue-700,
          .border-blue-200, .border-blue-300, .border-blue-500 {
            color: #000000 !important;
            background-color: #ffffff !important;
            border-color: #000000 !important;
          }
          .text-gray-600, .text-gray-700, .text-gray-800, .text-gray-900,
          .bg-gray-50, .bg-gray-100, .bg-gray-200 {
            color: #000000 !important;
            background-color: #ffffff !important;
          }
          .text-green-600, .text-green-700, .text-red-600, .text-red-700,
          .bg-green-50, .bg-red-50 {
            color: #000000 !important;
            background-color: #ffffff !important;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">${billData.companyName}</div>
          <div class="invoice-title">ESTIMATE</div>
          <div style="font-size: 14px; margin-top: 10px;">EST-${billData.orderNumber.toUpperCase()}</div>
        </div>
        
        <div class="info-section">
          <div class="info-box">
            <h3>Bill To:</h3>
            <p><strong class="highlight">${billData.customerName}</strong></p>
            <p>Phone: ${billData.customerPhone}</p>
          </div>
          <div class="info-box">
            <h3>Estimate Details:</h3>
            <p>Estimate #: <strong class="highlight">EST-${billData.orderNumber.toUpperCase()}</strong></p>
            <p>Date: ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        
        <!-- Order Items Section -->
        <div style="margin-bottom: 20px; padding: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="font-size: 18px; font-weight: bold; color: #000000;">Order Items</h3>
            <span style="font-size: 12px; color: #000000;">${billData.items.length} item(s)</span>
          </div>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Discount</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${billData.items.map((item) => `
              <tr>
                <td>
                  <div style="display: flex; align-items: flex-start; gap: 10px;">
                    <div style="width: 20px; height: 20px; border: 1px solid #000000; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0;">
                      ${item.isCustomProduct ? '🔧' : '📦'}
                    </div>
                    <div style="flex: 1;">
                      <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px;">${item.name}</div>
                      ${item.description ? `<div style="font-size: 10px; color: #333; margin-bottom: 1px; line-height: 1.2;">${item.description.replace(/\n/g, ' • ')}</div>` : ''}
                      ${item.category ? `<div style="font-size: 9px; color: #666; margin-bottom: 1px;"><strong>Category:</strong> ${item.category}</div>` : ''}
                      ${item.supplierName ? `<div style="font-size: 9px; color: #666; margin-bottom: 1px;"><strong>Supplier:</strong> ${item.supplierName}</div>` : ''}
                      ${item.specifications ? `<div style="font-size: 9px; color: #555; margin-top: 3px; padding: 2px 4px; background: #f5f5f5; border-left: 2px solid #333;"><strong>Specifications:</strong> ${item.specifications}</div>` : ''}
                      ${item.isCustomProduct && Object.keys(item.customConfig || {}).length > 0 ? `
                        <div style="font-size: 9px; color: #555; margin-top: 3px; padding: 2px 4px; background: #f0f8ff; border-left: 2px solid #0066cc;">
                          <strong>Custom Config:</strong> ${Object.entries(item.customConfig || {}).map(([key, value]) => `${key}: ${value}`).join(' • ')}
                        </div>
                      ` : ''}
                    </div>
                  </div>
                </td>
                <td style="vertical-align: top; padding-top: 8px;">
                  <span style="font-family: monospace; background: #f8f8f8; border: 1px solid #ddd; padding: 2px 6px; font-size: 9px; color: #333;">${item.sku || 'N/A'}</span>
                </td>
                <td style="text-align: center;">
                  <span style="background: #ffffff; border: 1px solid #000000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold;">${item.quantity}</span>
                </td>
                <td style="text-align: right;">Rs. ${item.price.toLocaleString('en-IN')}</td>
                <td style="text-align: right;">-</td>
                <td style="text-align: right;"><strong>Rs. ${item.total.toLocaleString('en-IN')}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="summary">
          <h4 style="font-size: 16px; font-weight: bold; color: #000000; margin-bottom: 15px;">Order Summary</h4>
          ${billData.subtotal && billData.subtotal !== billData.total ? `
            <div class="summary-row" style="text-decoration: line-through;">
              <span>Subtotal:</span>
              <span>Rs. ${billData.subtotal.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${billData.discount && billData.discount > 0 ? `
            <div class="summary-row">
              <span>Discount Applied:</span>
              <span>-Rs. ${billData.discount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${billData.tax && billData.tax > 0 ? `
            <div class="summary-row">
              <span>Tax:</span>
              <span>Rs. ${billData.tax.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div class="summary-row total">
            <span>Total Amount:</span>
            <span>Rs. ${billData.total.toLocaleString('en-IN')}</span>
          </div>
          ${billData.paymentInfo ? `
            <hr style="margin: 20px 0; border: none; border-top: 2px solid #e2e8f0;">
            <div style="background: #f8fafc !important; padding: 15px !important; border-radius: 6px !important; margin-top: 15px !important;">
              <h4 style="color: #1e40af !important; margin-bottom: 10px !important; font-size: 14px !important;">Payment Information</h4>
              <div class="summary-row">
                <span style="color: #000000 !important;">Total Paid:</span>
                <span style="color: #059669 !important;">Rs.${billData.paymentInfo.totalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div class="summary-row">
                <span style="color: #000000 !important;">Balance Due:</span>
                <span style="color: ${billData.paymentInfo.balanceDue > 0 ? '#dc2626' : '#059669'} !important;">Rs.${billData.paymentInfo.balanceDue.toLocaleString('en-IN')}</span>
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
      
      // Create a more user-friendly filename
      const customerName = billData.customerName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `PalakaERP_Estimate_${customerName}_${billData.orderNumber.slice(0,8)}.pdf`;

      // If no WhatsApp API is configured, use enhanced web experience
      if (!this.API_URL || !this.API_KEY) {
        
        // Try modern File System Access API if available (Chrome 86+)
        if ('showSaveFilePicker' in window) {
          try {
            // @ts-expect-error - File System Access API not in TypeScript types yet
            const fileHandle = await window.showSaveFilePicker({
              suggestedName: fileName,
              types: [{
                description: 'PDF files',
                accept: {
                  'application/pdf': ['.pdf'],
                },
              }],
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();
            
            // Create and copy the WhatsApp message
            const message = `📄 *Estimate from PalakaERP*

Dear ${billData.customerName},

Your estimate #${billData.orderNumber.slice(0,8)} is ready!

📋 *Order Summary:*
${billData.items.map(item => `• ${item.name} (${item.quantity}x) - Rs.${item.total.toLocaleString('en-IN')}`).join('\n')}

💰 *Total: Rs.${billData.total.toLocaleString('en-IN')}*

📞 Contact us: ${billData.companyPhone}

Thank you for choosing PalakaERP!`;

            // Copy message to clipboard
            await navigator.clipboard.writeText(message);
            
            // Open WhatsApp with the message
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
            
            return { 
              success: true, 
              message: `✅ PDF saved successfully!\n📋 Message copied to clipboard\n📱 WhatsApp opened - just attach the saved PDF and send!` 
            };
            
          } catch (fsError) {
            console.log('File System Access API failed, falling back to download:', fsError);
            // Fall back to regular download
          }
        }

        // Fallback: Regular download with enhanced UX
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Create professional WhatsApp message
        const message = `📄 *Estimate from PalakaERP*

Dear ${billData.customerName},

Your estimate #${billData.orderNumber.slice(0,8)} is ready!

📋 *Order Summary:*
${billData.items.map(item => `• ${item.name} (${item.quantity}x) - Rs.${item.total.toLocaleString('en-IN')}`).join('\n')}

💰 *Total: Rs.${billData.total.toLocaleString('en-IN')}*

📞 Contact us: ${billData.companyPhone}

Thank you for choosing PalakaERP!`;

        // Copy message to clipboard
        try {
          await navigator.clipboard.writeText(message);
        } catch (clipboardError) {
          console.warn('Could not copy to clipboard:', clipboardError);
        }

        // Open WhatsApp with pre-filled message
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMessage}`;
        
        // Add small delay to ensure download starts first
        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 500);
        
        return { 
          success: true, 
          message: `✅ PDF downloading as "${fileName}"\n📋 Message copied to clipboard\n📱 WhatsApp opening - please attach the downloaded PDF file` 
        };
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
      a.download = `Estimate_${billData.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
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
      console.log('Using generateSimplePDF fallback method');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      let currentY = margin;
      const lineHeight = 7;
      const pageWidth = 210;

      // Header - Company Info
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PalakaERP', margin, currentY);
      currentY += lineHeight;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Contact: +91 9645075858 | +91 8606056999 | +91 9747141858', margin, currentY);
      currentY += lineHeight * 2;

      // Document Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ESTIMATE', margin, currentY);
      currentY += lineHeight * 2;

      // Estimate details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Estimate #: ${billData.orderNumber}`, margin, currentY);
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
        pdf.text(`Rs.${item.price.toFixed(2)}`, margin + 120, currentY);
        pdf.text(`Rs.${item.total.toFixed(2)}`, margin + 150, currentY);
        currentY += lineHeight;
      });

      // Totals
      currentY += lineHeight;
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Subtotal: Rs.${billData.subtotal.toFixed(2)}`, margin + 120, currentY);
      currentY += lineHeight;
      if (billData.tax && billData.tax > 0) {
        pdf.text(`Tax: Rs.${billData.tax.toFixed(2)}`, margin + 120, currentY);
        currentY += lineHeight;
      }
      pdf.text(`Total: Rs.${billData.total.toFixed(2)}`, margin + 120, currentY);
      currentY += lineHeight * 2;

      // Payment information if available
      if (billData.paymentInfo) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Payment Information:', margin, currentY);
        currentY += lineHeight;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Total Paid: Rs.${billData.paymentInfo.totalPaid.toFixed(2)}`, margin, currentY);
        currentY += lineHeight;
        pdf.text(`Balance Due: Rs.${billData.paymentInfo.balanceDue.toFixed(2)}`, margin, currentY);
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
