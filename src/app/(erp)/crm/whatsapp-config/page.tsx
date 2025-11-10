'use client';

import React, { useState } from 'react';
import { Phone, Settings, Save, Plus, Trash2, AlertCircle } from 'lucide-react';

interface RoutingRule {
  id: string;
  keywords: string[];
  phoneNumber: string;
  department: string;
}

export default function WhatsAppRoutingConfigPage() {
  const [rules, setRules] = useState<RoutingRule[]>([
    {
      id: '1',
      keywords: ['furniture', 'sofa', 'chair', 'table', 'bed', 'wardrobe', 'dining', 'catalog', 'price', 'design', 'showroom'],
      phoneNumber: '+91XXXXXXXXXX',
      department: 'Sales - Furniture'
    },
    {
      id: '2',
      keywords: ['hiring', 'job', 'vacancy', 'position', 'apply', 'interview', 'career', 'employment', 'work', 'salary'],
      phoneNumber: '+91YYYYYYYYYY',
      department: 'HR - Recruitment'
    }
  ]);

  const [defaultNumber, setDefaultNumber] = useState('+91XXXXXXXXXX');
  const [isSaving, setIsSaving] = useState(false);

  const addRule = () => {
    const newRule: RoutingRule = {
      id: Date.now().toString(),
      keywords: [],
      phoneNumber: '',
      department: ''
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const updateRule = (id: string, field: keyof RoutingRule, value: string | string[]) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    try {
      // TODO: Save to database or config file
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate save
      alert('Configuration saved successfully!');
    } catch {
      alert('Error saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="h-8 w-8 text-blue-600" />
            WhatsApp Auto-Reply Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Configure automated message routing based on customer inquiries
          </p>
        </div>
        <button 
          onClick={saveConfiguration}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              How Auto-Routing Works
            </h3>
            <p className="text-sm text-blue-800 mb-2">
              When a customer messages your WhatsApp API number, the system:
            </p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Reads the message content</li>
              <li>Checks for keywords (furniture, hiring, etc.)</li>
              <li>Sends auto-reply with the matching phone number</li>
              <li>Creates/updates lead in CRM with routing info</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Default Routing */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-gray-600" />
          Default Routing (No Keywords Match)
        </h2>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Phone Number
          </label>
          <input 
            type="tel"
            value={defaultNumber}
            onChange={(e) => setDefaultNumber(e.target.value)}
            placeholder="+91XXXXXXXXXX"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            This number will be shown if no keywords match the customer&apos;s message
          </p>
        </div>
      </div>

      {/* Routing Rules */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Keyword-Based Routing Rules
          </h2>
          <button 
            onClick={addRule}
            className="flex items-center gap-2 px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>

        <div className="space-y-6">
          {rules.map((rule, index) => (
            <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Rule {index + 1}
                </h3>
                <button 
                  onClick={() => removeRule(rule.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department Name
                  </label>
                  <input 
                    type="text"
                    value={rule.department}
                    onChange={(e) => updateRule(rule.id, 'department', e.target.value)}
                    placeholder="e.g., Sales - Furniture"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number to Route To
                  </label>
                  <input 
                    type="tel"
                    value={rule.phoneNumber}
                    onChange={(e) => updateRule(rule.id, 'phoneNumber', e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Keywords */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Keywords (comma-separated)
                  </label>
                  <input 
                    type="text"
                    value={rule.keywords.join(', ')}
                    onChange={(e) => updateRule(rule.id, 'keywords', e.target.value.split(',').map(k => k.trim()))}
                    placeholder="e.g., furniture, sofa, chair, table"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If customer message contains any of these keywords, route to this number
                  </p>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                <p className="text-xs font-medium text-gray-600 mb-1">Auto-Reply Preview:</p>
                <p className="text-sm text-gray-700">
                  &ldquo;Thank you for contacting Al Rams Furniture! We have received your message and our <strong>{rule.department || '[Department]'}</strong> team will assist you shortly. For immediate assistance, call: <strong>{rule.phoneNumber || '[Phone Number]'}</strong>&rdquo;
                </p>
              </div>
            </div>
          ))}

          {rules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p>No routing rules configured. Click &ldquo;Add Rule&rdquo; to create one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Example Messages */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Example Messages & Routing
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Customer: &ldquo;I want to buy a sofa&rdquo;
              </p>
              <p className="text-xs text-green-700 mt-1">
                → Matches keyword &ldquo;sofa&rdquo; → Routes to {rules[0]?.phoneNumber || 'Number 1'} ({rules[0]?.department || 'Sales - Furniture'})
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900">
                Customer: &ldquo;Are you hiring for sales position?&rdquo;
              </p>
              <p className="text-xs text-purple-700 mt-1">
                → Matches keyword &ldquo;hiring&rdquo; → Routes to {rules[1]?.phoneNumber || 'Number 2'} ({rules[1]?.department || 'HR - Recruitment'})
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Customer: &ldquo;Hello&rdquo;
              </p>
              <p className="text-xs text-blue-700 mt-1">
                → No keywords match → Routes to {defaultNumber} (Default)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <button 
          onClick={saveConfiguration}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-lg font-medium"
        >
          <Save className="h-5 w-5" />
          {isSaving ? 'Saving Configuration...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
