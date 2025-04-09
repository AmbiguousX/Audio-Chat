require('dotenv').config({ path: '.env.local' });
const { Polar } = require('@polar-sh/sdk');

async function testPolar() {
  console.log('POLAR_ORGANIZATION_ID:', process.env.POLAR_ORGANIZATION_ID);
  console.log('POLAR_ACCESS_TOKEN:', process.env.POLAR_ACCESS_TOKEN ? 'Set (not showing for security)' : 'Not set');
  
  try {
    const polar = new Polar({
      server: 'sandbox',
      accessToken: process.env.POLAR_ACCESS_TOKEN,
    });
    
    console.log('Fetching products...');
    const { result } = await polar.products.list({
      organizationId: process.env.POLAR_ORGANIZATION_ID,
    });
    
    console.log('Products found:', result.items.length);
    if (result.items.length > 0) {
      console.log('Products:');
      result.items.forEach((product, index) => {
        console.log(`Product ${index + 1}:`);
        console.log(`  Name: ${product.name}`);
        console.log(`  Description: ${product.description}`);
        console.log(`  ID: ${product.id}`);
        console.log(`  Prices: ${product.prices.length}`);
        product.prices.forEach((price, priceIndex) => {
          console.log(`    Price ${priceIndex + 1}:`);
          console.log(`      ID: ${price.id}`);
          console.log(`      Amount: ${price.priceAmount / 100} ${price.priceCurrency}`);
          console.log(`      Interval: ${price.recurringInterval || 'one-time'}`);
        });
      });
    }
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

testPolar();
