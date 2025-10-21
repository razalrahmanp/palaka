# ⚡ Performance Optimization - Quick Reference

## 🚀 Deployment (30 seconds)

```powershell
# Option 1: Automated deployment
.\scripts\deploy-performance.ps1

# Option 2: Manual deployment
npm run build
git add .
git commit -m "feat: performance optimizations"
git push origin master
```

## 📊 Monitoring

### Real-time Dashboard
Visit: `/admin/performance`

### Key Metrics to Watch
- **Cache Hit Rate:** Should be >60%
- **Avg Response Time:** Should be <200ms
- **Slow Queries:** Should be minimal (0-5)

## 🗄️ Database Setup (Required!)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run: `database/performance_indexes.sql`
4. Verify indexes created

## 🔍 Troubleshooting

### Pages Still Slow?
```powershell
# Check if indexes are created
# Run in Supabase SQL Editor:
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

### Cache Not Working?
- Check `/admin/performance` dashboard
- Look for cache stats (should show keys > 0)
- Verify API routes use `getCachedData/setCachedData`

### Build Errors?
```powershell
# Clear cache and rebuild
Remove-Item -Recurse -Force .next
npm run build
```

## 📈 Expected Performance

| Metric | Target | Before |
|--------|--------|--------|
| Initial Load | 1-2s | 5-10s |
| API Response | 50-200ms | 500-2000ms |
| Cache Hit Rate | 60-80% | 0% |

## 🛠️ Quick Fixes

### Clear All Cache
```typescript
import { clearCache } from '@/lib/cache';
clearCache(); // Clear all
clearCache('vendors'); // Clear pattern
```

### Clear Performance Stats
```typescript
import { clearPerformanceData } from '@/lib/performance';
clearPerformanceData();
```

### Force Cache Refresh
Add `?refresh=true` to any API URL

## 📱 Key Files

- **Connection Pool:** `src/lib/supabasePool.ts`
- **Cache:** `src/lib/cache.ts`
- **Performance:** `src/lib/performance.ts`
- **Config:** `next.config.ts`
- **Indexes:** `database/performance_indexes.sql`

## ✅ Post-Deployment Checklist

- [ ] Run database indexes SQL
- [ ] Check Vercel deployment success
- [ ] Test page load time (<2s)
- [ ] Verify `/admin/performance` works
- [ ] Check cache hit rate (>60%)
- [ ] Monitor Vercel Analytics
- [ ] Test API response times

## 🎯 Quick Commands

```powershell
# Build and check bundle size
npm run build

# Run development server
npm run dev

# Deploy to production
.\scripts\deploy-performance.ps1

# Check TypeScript errors
npx tsc --noEmit

# View deployment logs
vercel logs
```

## 📞 Need Help?

1. Check `/admin/performance` dashboard
2. Review `docs/PERFORMANCE_OPTIMIZATION_COMPLETE.md`
3. Check Vercel deployment logs
4. Monitor slow operations in performance dashboard

---

**Quick Start:** Run `.\scripts\deploy-performance.ps1` and follow the prompts!
