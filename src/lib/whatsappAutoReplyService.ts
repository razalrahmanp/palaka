/**
 * WhatsApp Auto-Reply and Routing Service
 * 
 * This service handles incoming WhatsApp messages and:
 * 1. Sends automated welcome message
 * 2. Routes to appropriate phone number based on inquiry type
 * 3. Creates lead in CRM
 * 4. Tracks conversation
 */

interface WhatsAppMessage {
  from: string; // Customer's WhatsApp number
  message: string; // Message text
  timestamp: string;
  name?: string; // Customer's name (if available)
}

interface RoutingRule {
  keywords: string[]; // Keywords to match
  phoneNumber: string; // Which number to route to
  department: string; // Department name
}

export class WhatsAppAutoReplyService {
  private accessToken: string;
  private phoneNumberId: string;
  private baseUrl: string = 'https://graph.facebook.com/v18.0';

  // Your two existing phone numbers for routing
  // TODO: Update these with your actual phone numbers
  private routingRules: RoutingRule[] = [
    {
      keywords: ['furniture', 'sofa', 'chair', 'table', 'bed', 'wardrobe', 'dining', 'catalog', 'price', 'design', 'showroom', 'product', 'buy', 'purchase'],
      phoneNumber: '+91XXXXXXXXXX', // ⚠️ REPLACE with your Number 1 (Furniture Sales)
      department: 'Sales - Furniture'
    },
    {
      keywords: ['hiring', 'job', 'vacancy', 'position', 'apply', 'interview', 'career', 'employment', 'work', 'salary', 'resume', 'cv'],
      phoneNumber: '+91YYYYYYYYYY', // ⚠️ REPLACE with your Number 2 (HR/Recruitment)
      department: 'HR - Recruitment'
    }
  ];

  // Default routing (if no keywords match)
  private defaultRouting: RoutingRule = {
    keywords: [],
    phoneNumber: '+91XXXXXXXXXX', // ⚠️ REPLACE with your default number (usually Number 1)
    department: 'Sales - General'
  };

  constructor(accessToken?: string, phoneNumberId?: string) {
    this.accessToken = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp API credentials not configured');
    }
  }

  /**
   * Determine which number to route to based on message content
   */
  private determineRouting(message: string): RoutingRule {
    const lowerMessage = message.toLowerCase();

    // Check each routing rule
    for (const rule of this.routingRules) {
      for (const keyword of rule.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return rule;
        }
      }
    }

    // If no keywords match, use default routing
    return this.defaultRouting;
  }

  /**
   * Send automated welcome message with routing info
   */
  async sendAutoReply(to: string, customerMessage: string, customerName?: string): Promise<boolean> {
    try {
      // Determine which number to route to
      const routing = this.determineRouting(customerMessage);

      // Create personalized message
      const greeting = customerName ? `Hi ${customerName}` : 'Hello';
      
      const autoReplyMessage = `${greeting}! 👋

Thank you for contacting *Al Rams Furniture*! 🪑

We have received your message and our ${routing.department} team will assist you shortly.

📞 *For immediate assistance, you can also call us at:*
${routing.phoneNumber}

Our team typically responds within 15-30 minutes during business hours (9 AM - 7 PM).

Thank you for your patience! 🙏

_This is an automated message. A representative will reply soon._`;

      // Send message via WhatsApp Business API
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: autoReplyMessage
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to send auto-reply:', error);
        return false;
      }

      console.log('✅ Auto-reply sent successfully to', to);
      return true;
    } catch (error) {
      console.error('Error sending auto-reply:', error);
      return false;
    }
  }

  /**
   * Send different message for first contact vs returning customer
   */
  async sendSmartAutoReply(
    to: string, 
    customerMessage: string, 
    customerName?: string,
    isReturningCustomer: boolean = false
  ): Promise<boolean> {
    try {
      const routing = this.determineRouting(customerMessage);
      const greeting = customerName ? `Hi ${customerName}` : 'Hello';

      let message: string;

      if (isReturningCustomer) {
        // Shorter message for returning customers
        message = `${greeting}! Welcome back to *Al Rams Furniture*! 👋

We've received your message. Our ${routing.department} team will respond shortly.

📞 Call us at: ${routing.phoneNumber}

_This is an automated message._`;
      } else {
        // Detailed message for first-time customers
        message = `${greeting}! 👋

Thank you for contacting *Al Rams Furniture*! 🪑

We have received your inquiry and our ${routing.department} team will assist you shortly.

📞 *For immediate assistance, call:*
${routing.phoneNumber}

⏰ *Business Hours:* 9 AM - 7 PM (Mon-Sat)

🏪 *Visit our showroom:*
Al Rams Furniture, Edappal, Kerala

Our team typically responds within 15-30 minutes during business hours.

Thank you for choosing Al Rams! 🙏

_Automated message - A representative will reply soon._`;
      }

      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: message
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to send smart auto-reply:', error);
        return false;
      }

      console.log(`✅ Smart auto-reply sent to ${to} (${isReturningCustomer ? 'returning' : 'new'} customer, routed to ${routing.department})`);
      return true;
    } catch (error) {
      console.error('Error sending smart auto-reply:', error);
      return false;
    }
  }

  /**
   * Send message with quick reply buttons
   */
  async sendAutoReplyWithButtons(to: string, customerMessage: string): Promise<boolean> {
    try {
      const routing = this.determineRouting(customerMessage);

      const message = `Hello! 👋 Thank you for contacting *Al Rams Furniture*!

We've received your message. How would you like to proceed?`;

      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: message
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'call_now',
                    title: `📞 Call ${routing.phoneNumber.slice(-10)}`
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'wait_reply',
                    title: '⏰ Wait for Reply'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'visit_showroom',
                    title: '🏪 Visit Showroom'
                  }
                }
              ]
            }
          }
        })
      });

      if (!response.ok) {
        // If buttons not supported, fall back to text message
        return this.sendAutoReply(to, customerMessage);
      }

      console.log('✅ Auto-reply with buttons sent to', to);
      return true;
    } catch (error) {
      console.error('Error sending auto-reply with buttons:', error);
      // Fallback to simple text message
      return this.sendAutoReply(to, customerMessage);
    }
  }

  /**
   * Get routing info for display purposes
   */
  getRoutingInfo(message: string): RoutingRule {
    return this.determineRouting(message);
  }

  /**
   * Update routing rules dynamically
   */
  updateRoutingRules(rules: RoutingRule[]): void {
    this.routingRules = rules;
  }

  /**
   * Add new routing rule
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
  }
}

export default WhatsAppAutoReplyService;
