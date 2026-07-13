$src = "d:\Institute\institute1"
$dst = "d:\Institute\BCE"

# Copy page.tsx and Landing.css
Copy-Item -Path "$src\src\app\page.tsx"          -Destination "$dst\src\app\page.tsx" -Force
Copy-Item -Path "$src\src\app\Landing.css"       -Destination "$dst\src\app\Landing.css" -Force

# Copy core components
If (!(Test-Path "$dst\src\app\components")) { New-Item -ItemType Directory -Force -Path "$dst\src\app\components" }
Copy-Item -Path "$src\src\app\components\GallerySection.tsx"     -Destination "$dst\src\app\components\GallerySection.tsx" -Force
Copy-Item -Path "$src\src\app\components\ExploreMoreWrapper.tsx" -Destination "$dst\src\app\components\ExploreMoreWrapper.tsx" -Force

# Copy standard images
Copy-Item -Path "$src\public\student benifit.png" -Destination "$dst\public\student benifit.png" -Force
Copy-Item -Path "$src\public\faculty and hod.png" -Destination "$dst\public\faculty and hod.png" -Force

# Check and copy why_this.png
If (!(Test-Path "$dst\public\images")) { New-Item -ItemType Directory -Force -Path "$dst\public\images" }
Copy-Item -Path "$src\public\images\why_this.png" -Destination "$dst\public\images\why_this.png" -Force

# Also grab the smart_learning logo
Copy-Item -Path "$src\public\images\smart_learning logo.png" -Destination "$dst\public\images\smart_learning logo.png" -Force

Write-Host "BCE Landing Sync complete!"
