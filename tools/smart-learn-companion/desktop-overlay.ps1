<#
.SYNOPSIS
Smart Agent Global Desktop Overlay
Native Windows WPF Frameless, Transparent, Always-On-Top Desktop Overlay Window
#>

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$posFile = Join-Path $scriptDir "overlay-position.json"

# Load saved position or default
$savedLeft = 20
$savedTop = 100

if (Test-Path $posFile) {
    try {
        $posJson = Get-Content $posFile | ConvertFrom-Json
        if ($null -ne $posJson.left) { $savedLeft = [double]$posJson.left }
        if ($null -ne $posJson.top) { $savedTop = [double]$posJson.top }
    } catch { }
}

# Screen bounds clamping
$screenWidth = [System.Windows.SystemParameters]::PrimaryScreenWidth
$screenHeight = [System.Windows.SystemParameters]::PrimaryScreenHeight

if ($savedLeft -lt 10) { $savedLeft = 10 }
if ($savedLeft -gt ($screenWidth - 160)) { $savedLeft = $screenWidth - 160 }
if ($savedTop -lt 10) { $savedTop = 10 }
if ($savedTop -gt ($screenHeight - 60)) { $savedTop = $screenHeight - 60 }

# Create WPF Window
$window = New-Object System.Windows.Window
$window.WindowStyle = [System.Windows.WindowStyle]::None
$window.AllowsTransparency = $true
$window.Topmost = $true
$window.Background = [System.Windows.Media.Brushes]::Transparent
$window.Title = "Smart Agent Global Overlay"
$window.ShowInTaskbar = $false
$window.SizeToContent = [System.Windows.SizeToContent]::WidthAndHeight
$window.Left = $savedLeft
$window.Top = $savedTop

# Create Outer Border
$border = New-Object System.Windows.Controls.Border
$border.CornerRadius = New-Object System.Windows.CornerRadius(20)
$border.Padding = New-Object System.Windows.Thickness(12, 8, 14, 8)
$border.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#181825")
$border.BorderBrush = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#6c7086")
$border.BorderThickness = New-Object System.Windows.Thickness(1)
$border.Cursor = [System.Windows.Input.Cursors]::Hand

# Shadow effect
$shadow = New-Object System.Windows.Media.Effects.DropShadowEffect
$shadow.Color = [System.Windows.Media.Colors]::Black
$shadow.BlurRadius = 12
$shadow.ShadowDepth = 3
$shadow.Opacity = 0.6
$border.Effect = $shadow

# StackPanel Content
$stack = New-Object System.Windows.Controls.StackPanel
$stack.Orientation = [System.Windows.Controls.Orientation]::Horizontal

# Sparkles Icon Label
$iconLabel = New-Object System.Windows.Controls.TextBlock
$iconLabel.Text = "✦ "
$iconLabel.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#cba6f7")
$iconLabel.FontSize = 14
$iconLabel.FontWeight = [System.Windows.FontWeights]::Bold
$iconLabel.Margin = New-Object System.Windows.Thickness(0, 0, 4, 0)
$iconLabel.VerticalAlignment = [System.Windows.VerticalAlignment]::Center

# Text Label
$textLabel = New-Object System.Windows.Controls.TextBlock
$textLabel.Text = "Smart Agent"
$textLabel.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#cdd6f4")
$textLabel.FontSize = 13
$textLabel.FontWeight = [System.Windows.FontWeights]::SemiBold
$textLabel.VerticalAlignment = [System.Windows.VerticalAlignment]::Center

$stack.Children.Add($iconLabel) | Out-Null
$stack.Children.Add($textLabel) | Out-Null
$border.Child = $stack
$window.Content = $border

# Variables for Dragging & Clicking distinction
$script:isDragging = $false
$script:startPoint = $null

$border.Add_MouseLeftButtonDown({
    param($_sender, $e)
    $script:isDragging = $false
    $script:startPoint = $e.GetPosition($window)
    $window.DragMove()
})

$window.Add_LocationChanged({
    # Clamp inside screen bounds
    $curLeft = $window.Left
    $curTop = $window.Top
    $script:isDragging = $true
    
    # Save position
    try {
        @{ left = [math]::Round($curLeft); top = [math]::Round($curTop) } | ConvertTo-Json | Set-Content $posFile -Encoding UTF8
    } catch { }
})

# Click handler: toggle Smart Agent session drawer in paired browser or popup window
$border.Add_MouseLeftButtonUp({
    param($_sender, $e)
    if (-not $script:isDragging) {
        # Trigger companion toggle API or open browser tab
        try {
            $webReq = [System.Net.WebRequest]::Create("http://127.0.0.1:43127/toggle-agent")
            $webReq.Method = "POST"
            $webReq.Headers.Add("x-smart-learn-token", "smart-learn-local-companion-token-secure-v1")
            $webReq.Timeout = 1500
            $resp = $webReq.GetResponse()
            $resp.Close()
        } catch {
            # Fallback: launch default browser to local Smart Learn
            Start-Process "http://127.0.0.1:3000/dashboard"
        }
    }
})

# Run WPF App Loop
$app = New-Object System.Windows.Application
$app.Run($window) | Out-Null
