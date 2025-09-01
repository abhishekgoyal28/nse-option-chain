import { StockResearchService } from '@/services/StockResearchService';

async function testStockResearch(): Promise<void> {
  const service = new StockResearchService();
  
  console.log('🧪 Testing TypeScript Stock Research Service...\n');
  
  const testQueries = ['RELIANCE', 'TCS', 'INFY'];
  
  for (const query of testQueries) {
    try {
      console.log(`\n🔍 Testing: ${query}`);
      console.log('─'.repeat(50));
      
      const result = await service.researchStock(query);
      
      console.log(`✅ Symbol: ${result.symbol}`);
      console.log(`📊 Company: ${result.company}`);
      console.log(`💰 Price: ₹${result.data?.price?.toFixed(2) || 'N/A'}`);
      console.log(`📈 Change: ${result.data?.changePercent || 'N/A'}%`);
      console.log(`📰 News Items: ${result.news?.length || 0}`);
      console.log(`📝 Summary: ${result.summary?.overview?.substring(0, 100) || 'N/A'}...`);
      
    } catch (error) {
      console.log(`❌ Error testing ${query}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ TypeScript Stock Research test completed!');
}

// Export for potential use in other tests
export { testStockResearch };

// Run if called directly
if (require.main === module) {
  testStockResearch().catch(console.error);
}
