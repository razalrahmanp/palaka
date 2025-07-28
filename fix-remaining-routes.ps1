# PowerShell script to fix remaining Next.js 15 dynamic route parameter types

$routes = @(
    "src\app\api\hr\leave\[id]\route.ts",
    "src\app\api\crm\customers\[id]\route.ts",
    "src\app\api\crm\interactions\[id]\route.ts",
    "src\app\api\manufacturing\work_orders\[id]\route.ts",
    "src\app\api\products\[id]\route.ts",
    "src\app\api\sales\orders\[id]\route.ts",
    "src\app\api\settings\[key]\route.ts"
)

foreach ($route in $routes) {
    if (Test-Path $route) {
        Write-Host "Fixing: $route"
        
        # Read the file content
        $content = Get-Content $route -Raw
        
        # Fix GET method parameters
        $content = $content -replace 'export async function GET\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\s*\)', 'export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)'
        
        # Fix PUT method parameters  
        $content = $content -replace 'export async function PUT\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\s*\)', 'export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)'
        
        # Fix DELETE method parameters
        $content = $content -replace 'export async function DELETE\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\s*\)', 'export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)'
        
        # Fix PATCH method parameters
        $content = $content -replace 'export async function PATCH\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ id: string \} \}\s*\)', 'export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)'
        
        # Fix settings route with key parameter
        $content = $content -replace 'export async function GET\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ key: string \} \}\s*\)', 'export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
)'
        
        $content = $content -replace 'export async function PUT\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ key: string \} \}\s*\)', 'export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
)'
        
        $content = $content -replace 'export async function DELETE\(\s*request: NextRequest,\s*\{ params \}: \{ params: \{ key: string \} \}\s*\)', 'export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
)'
        
        # Add await params destructuring after try { 
        $content = $content -replace '(\) \{\s+try \{\s+)(\s*const \{ id \} = params;)', '$1const { id } = await params;'
        $content = $content -replace '(\) \{\s+try \{\s+)(\s*const \{ key \} = params;)', '$1const { key } = await params;'
        
        # Also handle cases where there's no existing const declaration
        $content = $content -replace '(\) \{\s+try \{\s+)((?!.*const \{ \w+ \} = await params;))', '$1const { id } = await params;$2'
        
        # Write the content back
        Set-Content $route $content -Encoding UTF8
        
        Write-Host "Fixed: $route"
    } else {
        Write-Host "File not found: $route"
    }
}

Write-Host "All remaining routes have been updated for Next.js 15 compatibility!"
