// Test file to check subcategoryMap
import { subcategoryMap } from '@/types';

console.log('Total categories:', Object.keys(subcategoryMap).length);
console.log('New Vehicle Fleet categories:');
Object.keys(subcategoryMap).filter(key => key.includes('Vehicle')).forEach(key => {
  console.log(`- ${key}: ${subcategoryMap[key].category} (${subcategoryMap[key].accountCode})`);
});

console.log('\nNew Daily Wages categories:');
Object.keys(subcategoryMap).filter(key => key.includes('Daily Wages')).forEach(key => {
  console.log(`- ${key}: ${subcategoryMap[key].category} (${subcategoryMap[key].accountCode})`);
});

console.log('\nAll categories:');
Object.keys(subcategoryMap).forEach(key => {
  console.log(`- ${key}`);
});
