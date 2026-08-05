$html = Get-Content 'C:\Users\adity\dash2.html' -Raw -ErrorAction SilentlyContinue
if (-not $html) { Write-Output 'dash2.html not found'; exit }

Write-Output ("HTML length: " + $html.Length)
Write-Output ("Contains NEXT_HTTP_ERROR_FALLBACK;404: " + $html.Contains('NEXT_HTTP_ERROR_FALLBACK;404'))
