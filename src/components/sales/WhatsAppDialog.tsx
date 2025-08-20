import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle,
  Phone,
  User,
  FileText,
  Send,
  X
} from 'lucide-react';

interface WhatsAppDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (phoneNumber: string, sendAsText: boolean) => void;
  customerName?: string;
  customerPhone?: string;
  orderNumber?: string;
  isLoading?: boolean;
}

export function WhatsAppDialog({
  isOpen,
  onClose,
  onSend,
  customerName,
  customerPhone,
  orderNumber,
  isLoading = false
}: WhatsAppDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState(customerPhone || '+91');
  const [sendAsText, setSendAsText] = useState(true);
  const [errors, setErrors] = useState<string>('');

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-numeric characters except +
    const cleanPhone = phone.replace(/[^+0-9]/g, '');
    
    // Basic validation: should start with + and have at least 10 digits
    if (!cleanPhone.startsWith('+')) {
      setErrors('Phone number must include country code (e.g., +91)');
      return false;
    }
    
    if (cleanPhone.length < 10) {
      setErrors('Phone number is too short');
      return false;
    }
    
    if (cleanPhone.length > 15) {
      setErrors('Phone number is too long');
      return false;
    }
    
    setErrors('');
    return true;
  };

  const handleSend = () => {
    if (!validatePhoneNumber(phoneNumber)) {
      return;
    }
    
    onSend(phoneNumber.trim(), sendAsText);
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    if (errors) {
      setErrors('');
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Auto-format phone number as user types
    let formatted = value.replace(/[^+0-9]/g, '');
    
    // Ensure it starts with + if not empty
    if (formatted && !formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Share Invoice via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Send the complete invoice details to the customer via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Information */}
          {(customerName || orderNumber) && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
              {customerName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Customer:</span>
                  <span>{customerName}</span>
                </div>
              )}
              {orderNumber && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Order:</span>
                  <span>#{orderNumber}</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              WhatsApp Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9876543210"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(formatPhoneNumber(e.target.value))}
              className={errors ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" />
                {errors}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Include country code (e.g., +91 for India, +1 for US)
            </p>
            <p className="text-xs text-blue-600">
              💡 Tip: Use your own number first to test the message format
            </p>
          </div>

          {/* Delivery Method Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Delivery Method</Label>
            <div className="space-y-2">
              <div 
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  sendAsText 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSendAsText(true)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={sendAsText}
                      onChange={() => setSendAsText(true)}
                      className="text-green-600"
                      aria-label="Send as text message"
                    />
                    <div>
                      <div className="font-medium text-sm">Text Message</div>
                      <div className="text-xs text-gray-500">
                        Send formatted invoice details as text
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Recommended
                  </Badge>
                </div>
              </div>
              
              <div 
                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                  !sendAsText 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSendAsText(false)}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={!sendAsText}
                    onChange={() => setSendAsText(false)}
                    className="text-blue-600"
                    aria-label="Send as PDF document"
                  />
                  <div>
                    <div className="font-medium text-sm">PDF Document</div>
                    <div className="text-xs text-gray-500">
                      Generate and send as PDF file
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isLoading || !phoneNumber.trim() || !!errors}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Sending...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Open WhatsApp
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
