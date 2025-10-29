'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle, Scale, Ban, RefreshCw, ShieldCheck } from 'lucide-react';

export default function TermsOfUsePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Terms of Use</h1>
        <p className="text-muted-foreground">
          Last updated: October 29, 2025
        </p>
      </div>

      {/* Agreement */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Agreement to Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            These Terms of Use constitute a legally binding agreement between you and Al Rams Furniture 
            & Interiors (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) concerning your access to and use of our 
            ERP system and related services (collectively, the &quot;Services&quot;).
          </p>
          <p>
            By accessing or using the Services, you agree to be bound by these Terms of Use and our 
            Privacy Policy. If you do not agree with these terms, you must not access or use the Services.
          </p>
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Important:</strong> These terms include limitations on our liability and require 
              you to resolve disputes through arbitration. Please read them carefully.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Eligibility */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Eligibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>You must meet the following requirements to use our Services:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You must be at least 18 years old</li>
            <li>You must have the legal authority to enter into this agreement</li>
            <li>You must not be prohibited from using the Services under applicable law</li>
            <li>Your use must comply with all local, state, national, and international laws</li>
          </ul>
        </CardContent>
      </Card>

      {/* Account Registration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Account Registration and Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Account Creation</h3>
            <p>When you create an account, you must:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your information to keep it accurate</li>
              <li>Create a strong, unique password</li>
              <li>Not share your account credentials with others</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Account Security</h3>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized access</li>
              <li>Ensuring proper logout after each session</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Account Termination</h3>
            <p>
              We reserve the right to suspend or terminate your account if you violate these Terms 
              or engage in fraudulent, illegal, or harmful activities.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Acceptable Use */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Acceptable Use Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>When using our Services, you agree to:</p>
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">✓ Permitted Uses</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Use the Services for legitimate business purposes</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Respect intellectual property rights</li>
                <li>Maintain data accuracy and integrity</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">✗ Prohibited Activities</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm">
                <li>Attempt to gain unauthorized access to systems or data</li>
                <li>Use the Services for illegal or fraudulent purposes</li>
                <li>Transmit viruses, malware, or harmful code</li>
                <li>Reverse engineer, decompile, or disassemble the software</li>
                <li>Interfere with or disrupt the Services or servers</li>
                <li>Harvest or collect user data without permission</li>
                <li>Impersonate others or misrepresent your identity</li>
                <li>Violate any intellectual property rights</li>
                <li>Send spam, unsolicited communications, or phishing attempts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intellectual Property */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Intellectual Property Rights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Our Content</h3>
            <p>
              All content, features, and functionality of the Services, including but not limited to 
              software, text, graphics, logos, images, and design, are owned by Al Rams Furniture & 
              Interiors and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Your Content</h3>
            <p>
              You retain ownership of any data, information, or content you submit to the Services 
              (&quot;Your Content&quot;). By submitting Your Content, you grant us a limited license to use, 
              store, and process it solely for providing the Services to you.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">License to Use</h3>
            <p>
              Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, 
              revocable license to access and use the Services for your business purposes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment and Billing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Fees</h3>
            <p>
              Access to certain features of the Services may require payment of fees. All fees are 
              non-refundable unless otherwise stated.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Billing</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fees are billed in advance on a recurring basis (monthly, annually)</li>
              <li>You authorize us to charge your payment method for all fees</li>
              <li>You must keep your payment information current</li>
              <li>Late payments may result in service suspension</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Price Changes</h3>
            <p>
              We reserve the right to modify our fees with 30 days&apos; notice. Continued use of the 
              Services after a price change constitutes acceptance of the new fees.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Service Availability */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Service Availability and Modifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Availability</h3>
            <p>
              We strive to provide reliable Services but do not guarantee uninterrupted access. 
              The Services may be unavailable due to maintenance, updates, or unforeseen issues.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Modifications</h3>
            <p>
              We reserve the right to modify, suspend, or discontinue any part of the Services at any 
              time, with or without notice. We are not liable for any modification, suspension, or 
              discontinuation of the Services.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Data Backup</h3>
            <p>
              While we perform regular backups, you are responsible for maintaining your own backup 
              copies of Your Content.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Disclaimer of Warranties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <p className="font-semibold mb-2">THE SERVICES ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;</p>
            <p className="text-sm">
              We make no warranties, express or implied, regarding the Services, including but not 
              limited to warranties of merchantability, fitness for a particular purpose, 
              non-infringement, or reliability.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            We do not warrant that the Services will be error-free, secure, or available at all times. 
            You use the Services at your own risk.
          </p>
        </CardContent>
      </Card>

      {/* Limitation of Liability */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Limitation of Liability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AL RAMS FURNITURE & INTERIORS SHALL NOT BE LIABLE 
            FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT 
            NOT LIMITED TO:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm">
            <li>Loss of profits, revenue, or data</li>
            <li>Business interruption or loss of business opportunity</li>
            <li>Costs of replacement goods or services</li>
            <li>Personal injury or property damage</li>
          </ul>
          <p className="text-sm mt-4">
            Our total liability to you for all claims arising from or related to the Services shall 
            not exceed the amount you paid us in the 12 months preceding the claim.
          </p>
        </CardContent>
      </Card>

      {/* Indemnification */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Indemnification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            You agree to indemnify, defend, and hold harmless Al Rams Furniture & Interiors, its 
            officers, directors, employees, and agents from any claims, losses, damages, liabilities, 
            and expenses (including legal fees) arising from:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your use or misuse of the Services</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Your Content or any data you submit</li>
          </ul>
        </CardContent>
      </Card>

      {/* Dispute Resolution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dispute Resolution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Governing Law</h3>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India, 
              without regard to its conflict of law provisions.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Arbitration</h3>
            <p>
              Any dispute arising from these Terms or the Services shall be resolved through binding 
              arbitration in Thrissur, Kerala, India, in accordance with applicable arbitration laws.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Jurisdiction</h3>
            <p>
              You agree to submit to the exclusive jurisdiction of the courts located in Thrissur, 
              Kerala, India, for any legal proceedings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Termination */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Termination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">By You</h3>
            <p>
              You may terminate your account at any time by contacting us. You remain responsible 
              for all fees incurred prior to termination.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">By Us</h3>
            <p>
              We may suspend or terminate your access immediately, without notice, for any violation 
              of these Terms or if we believe your actions may harm us or other users.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Effect of Termination</h3>
            <p>
              Upon termination, your right to use the Services will immediately cease. We may delete 
              Your Content after a reasonable period unless required by law to retain it.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* General Provisions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>General Provisions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Entire Agreement</h3>
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between 
              you and us regarding the Services.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Severability</h3>
            <p>
              If any provision of these Terms is found to be invalid or unenforceable, the remaining 
              provisions will continue in full force and effect.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Waiver</h3>
            <p>
              Our failure to enforce any right or provision of these Terms shall not be deemed a 
              waiver of such right or provision.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Assignment</h3>
            <p>
              You may not assign or transfer these Terms without our prior written consent. We may 
              assign our rights and obligations without restriction.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">5. Changes to Terms</h3>
            <p>
              We reserve the right to modify these Terms at any time. We will notify you of material 
              changes by posting the updated Terms with a new &quot;Last updated&quot; date. Your continued 
              use of the Services constitutes acceptance of the modified Terms.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            If you have any questions about these Terms of Use, please contact us:
          </p>
          <div className="space-y-2 text-sm">
            <p><strong>Al Rams Furniture & Interiors</strong></p>
            <p>Perumpilavu, Kunnamkulam, Thrissur, Kerala, India</p>
            <p>Phone: +91 90745 130574 / +91 96450 75858</p>
            <p>Email: legal@alramsfurniture.com</p>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            By using our Services, you acknowledge that you have read, understood, and agree to be 
            bound by these Terms of Use.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
