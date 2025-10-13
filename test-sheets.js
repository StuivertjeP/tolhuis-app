/**
 * Test script voor Google Sheets integratie
 * Voer uit met: node test-sheets.js
 */

import { getCurrentPeriod, testSheetsConnection } from './src/services/sheetsService.js';

async function testSheets() {
  console.log('🧪 Testing Google Sheets integration...\n');
  
  try {
    console.log('1. Testing connection...');
    const isConnected = await testSheetsConnection();
    console.log(`   Connection: ${isConnected ? '✅ Success' : '❌ Failed'}\n`);
    
    console.log('2. Fetching current period...');
    const period = await getCurrentPeriod();
    console.log(`   Period: "${period}"\n`);
    
    console.log('3. Testing cache...');
    const period2 = await getCurrentPeriod();
    console.log(`   Cached period: "${period2}"`);
    console.log(`   Cache working: ${period === period2 ? '✅ Yes' : '❌ No'}\n`);
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSheets();
