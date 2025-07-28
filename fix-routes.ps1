# PowerShell script to fix all Next.js 15 dynamic route parameter types

$routes = @(
    "src\app\api\crm\customers\[id]\route.ts",
    "src\app\api\crm\interactions\[id]\route.ts", 
    "src\app\api\finance\purchase-order\[id]\receive\route.ts",
    "src\app\api\hr\leave\[id]\route.ts",
    "src\app\api\hr\leave-balance\[id]\route.ts",
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
        
        # Replace the parameter type definitions
        $content = $content -replace '\{ params \}: \{ params: \{ id: string \} \}', '{ params }: { params: Promise<{ id: string }> }'
        $content = $content -replace '\{ params \}: \{ params: \{ key: string \} \}', '{ params }: { params: Promise<{ key: string }> }'
        
        # Add await params and destructure at the beginning of each function
        $content = $content -replace '(\w+: Request,\s+\{ params \}: \{ params: Promise<\{ \w+: string \}> \}\s+\) \{\s+try \{)', '$1`n    const { id } = await params;'
        $content = $content -replace '(\w+: Request,\s+\{ params \}: \{ params: Promise<\{ key: string \}> \}\s+\) \{\s+try \{)', '$1`n    const { key } = await params;'
        
        # Replace params.id with id and params.key with key
        $content = $content -replace 'params\.id', 'id'
        $content = $content -replace 'params\.key', 'key'
        
        # Write the content back
        Set-Content $route $content -Encoding UTF8
        
        Write-Host "Fixed: $route"
    } else {
        Write-Host "File not found: $route"
    }
}

Write-Host "All routes have been updated for Next.js 15 compatibility!"
