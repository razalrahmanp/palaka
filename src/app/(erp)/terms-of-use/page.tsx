'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle, Scale, CheckCircle, XCircle, Shield, Database } from 'lucide-react';

export default function TermsOfUsePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Terms of Use</h1>
        <p className="text-muted-foreground">
          Last updated: November 10, 2025
        </p>
      </div>

      {/* Introduction */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Introduction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Welcome to Al Rams Furniture & Interiors ERP System. These Terms of Use (&quot;Terms&quot;) govern 
            your access to and use of our Enterprise Resource Planning system, including all related services, 
            features, content, and applications (collectively, the &quot;Services&quot;).
          </p>
          <p>
            By accessing or using our Services, you agree to be bound by these Terms. If you do not agree 
            to these Terms, you may not access or use the Services.
          </p>
        </CardContent>
      </Card>

      {/* Acceptance of Terms */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Acceptance of Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            By creating an account and using our ERP system, you represent that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You are at least 18 years of age</li>
            <li>You have the legal authority to enter into these Terms</li>
            <li>You are an authorized employee or representative of Al Rams Furniture</li>
            <li>You will comply with all applicable laws and regulations</li>
            <li>All information you provide is accurate, current, and complete</li>
          </ul>
        </CardContent>
      </Card>

      {/* User Accounts and Security */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Accounts and Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Account Creation</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Accounts are created and managed by system administrators</li>
              <li>Each user is assigned a unique login credential</li>
              <li>User roles and permissions are defined based on job responsibilities</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Account Security</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>You are responsible for maintaining the confidentiality of your password</li>
              <li>You must notify us immediately of any unauthorized access or security breach</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>Do not share your login credentials with anyone</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms 
              or engage in fraudulent, abusive, or illegal activities.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Permitted Use */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Permitted Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>You may use the Services for the following purposes:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Managing customer relationships and sales orders</li>
            <li>Processing invoices and payments</li>
            <li>Managing inventory, procurement, and manufacturing</li>
            <li>Employee management, attendance, and payroll</li>
            <li>Financial reporting and analytics</li>
            <li>Marketing campaigns and lead management</li>
            <li>Any other business-related activities within your assigned permissions</li>
          </ul>
        </CardContent>
      </Card>

      {/* Prohibited Use */}
      <Card className="mb-6 border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Prohibited Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>You agree NOT to:</p>
          <ul className="list-disc pl-6 space-y-2 text-red-900">
            <li>Use the Services for any illegal or unauthorized purpose</li>
            <li>Violate any laws, regulations, or third-party rights</li>
            <li>Access data or features you are not authorized to use</li>
            <li>Attempt to gain unauthorized access to the system or other users&apos; accounts</li>
            <li>Interfere with or disrupt the Services or servers</li>
            <li>Introduce viruses, malware, or any malicious code</li>
            <li>Reverse engineer, decompile, or disassemble the software</li>
            <li>Copy, modify, or distribute the Services without authorization</li>
            <li>Use automated tools (bots, scrapers) without permission</li>
            <li>Remove or alter any copyright, trademark, or proprietary notices</li>
            <li>Share confidential business information with unauthorized parties</li>
            <li>Use the Services to compete with Al Rams Furniture</li>
          </ul>
        </CardContent>
      </Card>

      {/* Data and Privacy */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data and Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            All data entered into the ERP system is the property of Al Rams Furniture. You acknowledge that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>We collect and process data as described in our <a href="/privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</a></li>
            <li>You will only access data necessary for your job responsibilities</li>
            <li>You will maintain confidentiality of sensitive business information</li>
            <li>Customer data must be handled in compliance with data protection laws</li>
            <li>You will not export or download data for unauthorized purposes</li>
          </ul>
        </CardContent>
      </Card>

      {/* Intellectual Property */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Intellectual Property
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            The ERP system, including all software, code, designs, graphics, and content, is the 
            exclusive property of Al Rams Furniture and is protected by copyright, trademark, and 
            other intellectual property laws.
          </p>
          <p>
            No part of the Services may be reproduced, distributed, or transmitted in any form without 
            our prior written consent.
          </p>
        </CardContent>
      </Card>

      {/* System Availability */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>System Availability and Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We strive to maintain the Services operational 24/7. However, we do not guarantee 
            uninterrupted access and may:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Perform scheduled maintenance (with advance notice when possible)</li>
            <li>Make emergency updates or repairs</li>
            <li>Experience temporary downtime due to technical issues</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            We are not liable for any losses resulting from system downtime or maintenance.
          </p>
        </CardContent>
      </Card>

      {/* Disclaimer of Warranties */}
      <Card className="mb-6 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Disclaimer of Warranties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-semibold uppercase">
            THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND.
          </p>
          <p>
            We do not warrant that:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The Services will be error-free or uninterrupted</li>
            <li>Defects will be corrected immediately</li>
            <li>The Services are free from viruses or harmful components</li>
            <li>Results obtained from the Services will be accurate or reliable</li>
          </ul>
        </CardContent>
      </Card>

      {/* Limitation of Liability */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Limitation of Liability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            To the maximum extent permitted by law, Al Rams Furniture shall not be liable for:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Any indirect, incidental, special, or consequential damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Damages resulting from unauthorized access or data breaches</li>
            <li>Damages caused by user error or misuse of the Services</li>
          </ul>
        </CardContent>
      </Card>

      {/* Indemnification */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Indemnification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            You agree to indemnify and hold harmless Al Rams Furniture from any claims, damages, 
            losses, or expenses arising from:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your violation of these Terms</li>
            <li>Your misuse of the Services</li>
            <li>Your violation of any laws or third-party rights</li>
            <li>Unauthorized access using your credentials</li>
          </ul>
        </CardContent>
      </Card>

      {/* Changes to Terms */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Changes to These Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            We reserve the right to modify these Terms at any time. We will notify users of any 
            material changes by posting the updated Terms on this page and updating the &quot;Last Updated&quot; 
            date.
          </p>
          <p>
            Your continued use of the Services after changes are posted constitutes acceptance of 
            the modified Terms.
          </p>
        </CardContent>
      </Card>

      {/* Governing Law */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Governing Law
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India. 
            Any disputes arising from these Terms or use of the Services shall be subject to the 
            exclusive jurisdiction of the courts in Kerala, India.
          </p>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            If you have any questions about these Terms of Use, please contact us:
          </p>
          <div className="space-y-2">
            <p><strong>Al Rams Furniture & Interiors</strong></p>
            <p>Edappal, Kerala, India</p>
            <p>Email: support@alramsfurniture.shop</p>
            <p>Phone: +91 85909 49001</p>
          </div>
        </CardContent>
      </Card>

      {/* Acceptance */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-center">
            By using our ERP system, you acknowledge that you have read, understood, and agree to be 
            bound by these Terms of Use and our Privacy Policy.
          </p>
        </CardContent>
      </Card>

      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>© 2025 Al Rams Furniture & Interiors. All rights reserved.</p>
      </div>
    </div>
  );
}
