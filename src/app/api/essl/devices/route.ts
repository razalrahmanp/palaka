/**
 * ESSL Device Management API
 * Register and manage ESSL devices in the database
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createESSLConnector } from '@/lib/essl/connector';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: List all registered devices
export async function GET() {
  try {
    const { data: devices, error } = await supabase
      .from('essl_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log('Devices from database:', devices);
    console.log('Device count:', devices?.length);
    if (devices && devices.length > 0) {
      console.log('First device:', devices[0]);
      console.log('First device ID:', devices[0].id, 'Type:', typeof devices[0].id);
    }

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

// POST: Register a new device
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      device_name,
      ip_address,
      port = 4370,
      location,
      device_type = 'fingerprint',
    } = body;

    if (!device_name || !ip_address) {
      return NextResponse.json(
        { error: 'Device name and IP address are required' },
        { status: 400 }
      );
    }

    // Test connection first
    const connector = createESSLConnector(ip_address, port);
    await connector.connect();
    const deviceInfo = await connector.getDeviceInfo();
    await connector.disconnect();

    // Insert device into database
    const { data: device, error: insertError } = await supabase
      .from('essl_devices')
      .insert({
        device_name,
        device_serial: deviceInfo.serialNumber,
        ip_address,
        port,
        location,
        device_type,
        status: 'active',
        last_connected: new Date().toISOString(),
        total_capacity: deviceInfo.logCapacity,
        enrolled_users: deviceInfo.userCount,
        firmware_version: deviceInfo.firmwareVersion,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: 'Device registered successfully',
      device,
    });
  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register device',
      },
      { status: 500 }
    );
  }
}

// PATCH: Update device status or details
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const { data: device, error } = await supabase
      .from('essl_devices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Device updated successfully',
      device,
    });
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

// DELETE: Remove device
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('essl_devices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Device removed successfully',
    });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}
