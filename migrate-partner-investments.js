// Migration script to transfer initial_investment from partners table to investments table
// This fixes the issue where partners have initial investments but no records in investments table

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migratePartnerInvestments() {
  console.log('🔍 Starting migration of partner initial investments...');
  
  try {
    // 1. Get all partners with initial_investment > 0 who don't have corresponding investment records
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select(`
        id,
        name,
        initial_investment,
        created_at,
        partner_type
      `)
      .gt('initial_investment', 0)
      .eq('is_active', true);

    if (partnersError) {
      console.error('❌ Error fetching partners:', partnersError);
      return;
    }

    if (!partners || partners.length === 0) {
      console.log('✅ No partners with initial investments found.');
      return;
    }

    console.log(`📊 Found ${partners.length} partners with initial investments`);

    // 2. Get default investment category (Initial Capital)
    const { data: defaultCategory } = await supabase
      .from('investment_categories')
      .select('id')
      .eq('category_name', 'Initial Capital')
      .single();

    if (!defaultCategory) {
      console.error('❌ Default investment category "Initial Capital" not found');
      return;
    }

    // 3. Get fallback user for created_by field
    const { data: fallbackUser } = await supabase
      .from('users')
      .select('id')
      .eq('is_deleted', false)
      .limit(1)
      .single();

    if (!fallbackUser) {
      console.error('❌ No valid user found for created_by field');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    // 4. Process each partner
    for (const partner of partners) {
      console.log(`\n🔄 Processing partner: ${partner.name} (₹${partner.initial_investment})`);

      // Check if investment record already exists for this partner's initial investment
      const { data: existingInvestment } = await supabase
        .from('investments')
        .select('id, amount')
        .eq('partner_id', partner.id)
        .eq('description', `Initial investment by ${partner.name}`)
        .single();

      if (existingInvestment) {
        console.log(`   ⏭️  Investment record already exists (₹${existingInvestment.amount})`);
        skippedCount++;
        continue;
      }

      // Create investment record
      const { data: newInvestment, error: investmentError } = await supabase
        .from('investments')
        .insert({
          partner_id: partner.id,
          category_id: defaultCategory.id,
          amount: partner.initial_investment,
          investment_date: partner.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          description: `Initial investment by ${partner.name}`,
          payment_method: 'cash',
          bank_account_id: null,
          reference_number: `MIGRATION-${partner.id}`,
          upi_reference: null,
          notes: 'Migrated from partners.initial_investment field',
          created_by: fallbackUser.id,
          created_at: partner.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (investmentError) {
        console.error(`   ❌ Error creating investment for ${partner.name}:`, investmentError);
        continue;
      }

      console.log(`   ✅ Created investment record: ₹${partner.initial_investment}`);
      migratedCount++;
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${migratedCount} investments`);
    console.log(`   ⏭️  Skipped (already exists): ${skippedCount} investments`);
    console.log(`   💰 Total amount migrated: ₹${partners.reduce((sum, p) => sum + (parseFloat(p.initial_investment) || 0), 0)}`);
    
    if (migratedCount > 0) {
      console.log(`\n🎯 Next Steps:`);
      console.log(`   1. Refresh your cashflow tab to see the new investment entries`);
      console.log(`   2. Verify the amounts match your expectations`);
      console.log(`   3. Check that accounting entries are correct`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
migratePartnerInvestments()
  .then(() => {
    console.log('\n🏁 Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });