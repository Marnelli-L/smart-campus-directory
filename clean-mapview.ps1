# PowerShell script to clean MapView.jsx - Remove pathfinding logic only

$filePath = "c:\smart-campus-directory\frontend\src\components\MapView.jsx"
$content = Get-Content $filePath -Raw

# 1. Remove the pathfinding import
$content = $content -replace "import \{ findSimpleRoute \} from '../utils/simplePathfinding';", "// Pathfinding removed - showing markers only"

# 2. Comment out unused state variables
$content = $content -replace "const \[routeInfo, setRouteInfo\] = useState\(null\);", "// const [routeInfo, setRouteInfo] = useState(null); // Removed"
$content = $content -replace "const watchIdRef = useRef\(null\);", "// const watchIdRef = useRef(null); // Removed"
$content = $content -replace "const lastLocationLogRef = useRef\(0\);", "// const lastLocationLogRef = useRef(0); // Removed"  
$content = $content -replace "const \[_isNavigating, setIsNavigating\] = useState\(false\);", "// const [_isNavigating, setIsNavigating] = useState(false); // Removed"
$content = $content -replace "const \[currentUserLocation, setCurrentUserLocation\] = useState\(null\);", "// const [currentUserLocation, setCurrentUserLocation] = useState(null); // Removed"
$content = $content -replace "const \[_destinationCoords, setDestinationCoords\] = useState\(null\);", "// const [_destinationCoords, setDestinationCoords] = useState(null); // Removed"
$content = $content -replace "const \[_remainingDistance, setRemainingDistance\] = useState\(null\);", "// const [_remainingDistance, setRemainingDistance] = useState(null); // Removed"
$content = $content -replace "const navigationIntervalRef = useRef\(null\);", "// const navigationIntervalRef = useRef(null); // Removed"

# Save the cleaned file
$content | Set-Content $filePath -NoNewline

Write-Host "✅ MapView.jsx cleaned - pathfinding imports and unused state removed" -ForegroundColor Green
Write-Host "⚠️  Note: You'll still need to manually remove the location tracking functions" -ForegroundColor Yellow
Write-Host "   (startLocationTracking, stopLocationTracking, and navigation functions around line 1250-1500)" -ForegroundColor Yellow
