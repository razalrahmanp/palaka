#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

function updateImportsInFile(filePath) {
  try {
    let content = readFileSync(filePath, 'utf8');
    let updated = false;

    // Replace various import patterns
    const patterns = [
      {
        from: /import { supabase } from '@\/lib\/supabaseAdmin'/g,
        to: "import { supabase } from '@/lib/supabasePool'"
      },
      {
        from: /import { supabase as supabaseAdmin } from '@\/lib\/supabaseAdmin'/g,
        to: "import { supabase as supabaseAdmin } from '@/lib/supabasePool'"
      },
      {
        from: /from '@\/lib\/supabaseAdmin';/g,
        to: "from '@/lib/supabasePool';"
      }
    ];

    patterns.forEach(pattern => {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        updated = true;
      }
    });

    if (updated) {
      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function findAndUpdateFiles(dir, fileExtension = '.ts') {
  let updatedCount = 0;
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        updatedCount += findAndUpdateFiles(fullPath, fileExtension);
      } else if (stat.isFile() && extname(item) === fileExtension) {
        if (updateImportsInFile(fullPath)) {
          updatedCount++;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error processing directory ${dir}:`, error.message);
  }
  
  return updatedCount;
}

// Main execution
const apiDir = './src/app/api';
console.log('🚀 Starting import updates...');
const totalUpdated = findAndUpdateFiles(apiDir);
console.log(`\n✅ Update complete! ${totalUpdated} files updated.`);