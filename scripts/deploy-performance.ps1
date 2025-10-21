# Performance Optimization Deployment Script
# Run this script to deploy all performance optimizations

Write-Host "🚀 Palaka ERP - Performance Optimization Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify Git status
Write-Host "Step 1: Checking Git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "✓ Changes detected, ready to commit" -ForegroundColor Green
} else {
    Write-Host "! No changes to commit" -ForegroundColor Red
    exit
}

# Step 2: Run build to check for errors
Write-Host ""
Write-Host "Step 2: Building project to verify no errors..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed! Please fix errors before deploying." -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build successful!" -ForegroundColor Green

# Step 3: Commit changes
Write-Host ""
Write-Host "Step 3: Committing performance optimizations..." -ForegroundColor Yellow
git add .
git commit -m "feat: Comprehensive performance optimizations for Vercel deployment

- Implemented Supabase connection pooling with singleton pattern
- Added API response caching with TTL support
- Created performance monitoring dashboard
- Updated 121 API routes to use optimized connection pool
- Added loading states with skeleton components
- Integrated Vercel Analytics and Speed Insights
- Optimized Next.js configuration for production
- Created database performance indexes
- Enhanced cache hit/miss tracking

Expected improvements:
- 80% faster initial page load
- 90% faster API responses
- 90% faster database queries
- Real-time performance monitoring"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Changes committed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Commit failed" -ForegroundColor Red
    exit 1
}

# Step 4: Push to repository
Write-Host ""
Write-Host "Step 4: Pushing to remote repository..." -ForegroundColor Yellow
git push origin master
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Changes pushed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Push failed" -ForegroundColor Red
    exit 1
}

# Step 5: Database indexes reminder
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "📋 IMPORTANT: Post-Deployment Steps" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run Database Indexes:" -ForegroundColor Yellow
Write-Host "   - Open Supabase Dashboard > SQL Editor" -ForegroundColor White
Write-Host "   - Run: database/performance_indexes.sql" -ForegroundColor White
Write-Host ""
Write-Host "2. Verify Deployment:" -ForegroundColor Yellow
Write-Host "   - Check Vercel Dashboard for build status" -ForegroundColor White
Write-Host "   - Test main pages load time (target: <2s)" -ForegroundColor White
Write-Host ""
Write-Host "3. Monitor Performance:" -ForegroundColor Yellow
Write-Host "   - Visit: /admin/performance dashboard" -ForegroundColor White
Write-Host "   - Check Vercel Analytics" -ForegroundColor White
Write-Host "   - Monitor cache hit rates" -ForegroundColor White
Write-Host ""
Write-Host "4. Performance Targets:" -ForegroundColor Yellow
Write-Host "   - Initial Load: <2 seconds (was 5-10s)" -ForegroundColor White
Write-Host "   - API Response: <200ms (was 500-2000ms)" -ForegroundColor White
Write-Host "   - Cache Hit Rate: >60%" -ForegroundColor White
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ Deployment initiated successfully!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 View deployment progress:" -ForegroundColor White
Write-Host "   Vercel Dashboard: https://vercel.com" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 Full documentation:" -ForegroundColor White
Write-Host "   docs/PERFORMANCE_OPTIMIZATION_COMPLETE.md" -ForegroundColor Cyan
Write-Host ""
