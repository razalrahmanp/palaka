//src/app/api/crm/customers/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextResponse } from 'next/server'

export async function GET() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    pincode,
    floor,
    notes,
    status,
    source,
    tags,
    created_by
  } = await req.json()

  // Geocode address if provided
  let latitude = null;
  let longitude = null;
  let formatted_address = null;
  let geocoded_at = null;

  if (address) {
    try {
      const fullAddress = `${address}${floor ? ', Floor: ' + floor : ''}${city ? ', ' + city : ''}${state ? ', ' + state : ''}${pincode ? ' - ' + pincode : ''}`;
      const geocodeResult = await geocodeAddress(fullAddress);
      if (geocodeResult) {
        latitude = geocodeResult.latitude;
        longitude = geocodeResult.longitude;
        formatted_address = geocodeResult.formatted_address;
        geocoded_at = new Date().toISOString();
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      // Continue without geocoding if it fails
    }
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([
      {
        name,
        email: email || null, // Use null instead of empty string for UNIQUE constraint
        phone,
        address,
        city,
        state,
        pincode,
        floor,
        notes,
        status: status || 'Lead',
        source: source || 'Website',
        tags: tags || [],
        created_by: created_by || null, // Use null if no valid user ID
        latitude,
        longitude,
        formatted_address,
        geocoded_at
      }
    ])
    .select()

  if (error) {
    console.error('Customer creation error:', error);
    return NextResponse.json({ 
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code 
    }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 })
}

// Geocoding function using Google Maps Geocoding API
async function geocodeAddress(address: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.warn('Google Maps API key not found. Skipping geocoding.');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formatted_address: result.formatted_address
      };
    } else {
      console.warn('Geocoding failed:', data.status);
      return null;
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
export async function PUT(req: Request) {
  const { id, ...updateData } = await req.json()

  // Check if address fields are being updated and geocode if needed
  const processedData = { ...updateData };
  
  if (updateData.address || updateData.city || updateData.state || updateData.pincode || updateData.floor) {
    try {
      const fullAddress = `${updateData.address || ''}${updateData.floor ? ', Floor: ' + updateData.floor : ''}${updateData.city ? ', ' + updateData.city : ''}${updateData.state ? ', ' + updateData.state : ''}${updateData.pincode ? ' - ' + updateData.pincode : ''}`;
      
      if (fullAddress.trim()) {
        const geocodeResult = await geocodeAddress(fullAddress);
        if (geocodeResult) {
          processedData.latitude = geocodeResult.latitude;
          processedData.longitude = geocodeResult.longitude;
          processedData.formatted_address = geocodeResult.formatted_address;
          processedData.geocoded_at = new Date().toISOString();
        }
      }
    } catch (error) {
      console.error('Geocoding failed during update:', error);
      // Continue without geocoding if it fails
    }
  }

  processedData.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('customers')
    .update(processedData)
    .eq('id', id)

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ message: 'Customer updated successfully' })
}