// Test script to populate tropical disposal table
// Run this with: node scripts/test-populate-disposal.js

const API_BASE_URL = 'http://127.0.0.1:5000';

async function testPopulateDisposal() {
  try {
    console.log('🌴 Testing Tropical Disposal Table Population with Gemini AI...\n');
    
    // Step 1: Get unique materials count
    console.log('📊 Step 1: Getting unique materials count...');
    const materialsResponse = await fetch(`${API_BASE_URL}/materials/unique`);
    const materialsData = await materialsResponse.json();
    console.log(`   Found ${materialsData.count} unique materials`);
    console.log(`   Materials: ${materialsData.materials.slice(0, 5).join(', ')}${materialsData.materials.length > 5 ? '...' : ''}\n`);
    
    // Step 2: Check existing tropical disposal entries
    console.log('🔍 Step 2: Checking existing tropical disposal entries...');
    const existingResponse = await fetch(`${API_BASE_URL}/disposal/climate/Tropical`);
    const existingData = await existingResponse.json();
    const existingCount = existingData.disposal_methods ? existingData.disposal_methods.length : 0;
    console.log(`   Found ${existingCount} existing tropical disposal entries\n`);
    
    // Step 3: Populate disposal table
    console.log('🚀 Step 3: Populating tropical disposal table...');
    const populateResponse = await fetch(`${API_BASE_URL}/disposal/populate-tropical`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const populateData = await populateResponse.json();
    console.log('   Population Results:');
    console.log(`   ✅ Processed: ${populateData.results.processed}`);
    console.log(`   ✅ Successful: ${populateData.results.successful}`);
    console.log(`   ❌ Failed: ${populateData.results.failed}`);
    console.log(`   ⏭️  Skipped: ${populateData.results.skipped}`);
    
    if (populateData.results.errors.length > 0) {
      console.log(`   🚨 Errors: ${populateData.results.errors.length}`);
      populateData.results.errors.forEach((error, index) => {
        console.log(`      ${index + 1}. ${error}`);
      });
    }
    
    // Step 4: Verify final count
    console.log('\n🔍 Step 4: Verifying final count...');
    const finalResponse = await fetch(`${API_BASE_URL}/disposal/climate/Tropical`);
    const finalData = await finalResponse.json();
    const finalCount = finalData.disposal_methods ? finalData.disposal_methods.length : 0;
    console.log(`   Final tropical disposal entries: ${finalCount}`);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPopulateDisposal();
