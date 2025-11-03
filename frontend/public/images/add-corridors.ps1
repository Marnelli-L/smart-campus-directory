# Load existing GeoJSON
$geojson = Get-Content "smart-campus-map.geojson" -Raw | ConvertFrom-Json

# Remove existing LineStrings
$geojson.features = $geojson.features | Where-Object { $_.geometry.type -ne "LineString" }

# Create comprehensive corridor network
# Main horizontal corridor (west to east)
$corridor1 = @{
    type = "Feature"
    properties = @{
        type = "corridor"
        name = "Main West-East Corridor"
    }
    geometry = @{
        type = "LineString"
        coordinates = @(
            @(120.980900, 14.593020),  # West entrance
            @(120.980950, 14.593025),
            @(120.981000, 14.593030),
            @(120.981050, 14.593035),
            @(120.981100, 14.593040),
            @(120.981150, 14.593045),
            @(120.981200, 14.593050),
            @(120.981250, 14.593055),
            @(120.981300, 14.593060),
            @(120.981350, 14.593065),
            @(120.981400, 14.593070),
            @(120.981450, 14.593075),
            @(120.981500, 14.593080),
            @(120.981550, 14.593085),
            @(120.981600, 14.593090),
            @(120.981650, 14.593095)   # East end
        )
    }
    id = "corridor-main-horizontal"
}

# Main vertical corridor (north to south through center)
$corridor2 = @{
    type = "Feature"
    properties = @{
        type = "corridor"
        name = "Main North-South Corridor"
    }
    geometry = @{
        type = "LineString"
        coordinates = @(
            @(120.981300, 14.593100),  # North
            @(120.981300, 14.593050),
            @(120.981300, 14.593000),
            @(120.981300, 14.592950),
            @(120.981300, 14.592900),
            @(120.981300, 14.592850),
            @(120.981300, 14.592800),
            @(120.981300, 14.592750),
            @(120.981300, 14.592700),
            @(120.981300, 14.592650),
            @(120.981300, 14.592600),
            @(120.981300, 14.592550),
            @(120.981300, 14.592500),
            @(120.981300, 14.592450),
            @(120.981300, 14.592400),
            @(120.981300, 14.592350),
            @(120.981300, 14.592300),
            @(120.981300, 14.592250),
            @(120.981300, 14.592200),
            @(120.981300, 14.592150),
            @(120.981300, 14.592100),
            @(120.981300, 14.592050),
            @(120.981300, 14.592000),
            @(120.981300, 14.591950),
            @(120.981300, 14.591900),
            @(120.981300, 14.591850),
            @(120.981300, 14.591800)   # South
        )
    }
    id = "corridor-main-vertical"
}

# Western vertical corridor
$corridor3 = @{
    type = "Feature"
    properties = @{
        type = "corridor"
        name = "West Wing Corridor"
    }
    geometry = @{
        type = "LineString"
        coordinates = @(
            @(120.981000, 14.593030),
            @(120.981000, 14.592980),
            @(120.981000, 14.592930),
            @(120.981000, 14.592880),
            @(120.981000, 14.592830),
            @(120.981000, 14.592780),
            @(120.981000, 14.592730),
            @(120.981000, 14.592680),
            @(120.981000, 14.592630),
            @(120.981000, 14.592580),
            @(120.981000, 14.592530),
            @(120.981000, 14.592480),
            @(120.981000, 14.592430),
            @(120.981000, 14.592380),
            @(120.981000, 14.592330),
            @(120.981000, 14.592280),
            @(120.981000, 14.592230),
            @(120.981000, 14.592180)
        )
    }
    id = "corridor-west-vertical"
}

# Eastern vertical corridor
$corridor4 = @{
    type = "Feature"
    properties = @{
        type = "corridor"
        name = "East Wing Corridor"
    }
    geometry = @{
        type = "LineString"
        coordinates = @(
            @(120.981600, 14.593090),
            @(120.981600, 14.593040),
            @(120.981600, 14.592990),
            @(120.981600, 14.592940),
            @(120.981600, 14.592890),
            @(120.981600, 14.592840),
            @(120.981600, 14.592790),
            @(120.981600, 14.592740),
            @(120.981600, 14.592690),
            @(120.981600, 14.592640),
            @(120.981600, 14.592590),
            @(120.981600, 14.592540),
            @(120.981600, 14.592490),
            @(120.981600, 14.592440),
            @(120.981600, 14.592390),
            @(120.981600, 14.592340),
            @(120.981600, 14.592290),
            @(120.981600, 14.592240),
            @(120.981600, 14.592190),
            @(120.981600, 14.592140),
            @(120.981600, 14.592090),
            @(120.981600, 14.592040),
            @(120.981600, 14.591990),
            @(120.981600, 14.591940),
            @(120.981600, 14.591890),
            @(120.981600, 14.591840),
            @(120.981600, 14.591790),
            @(120.981600, 14.591740)
        )
    }
    id = "corridor-east-vertical"
}

# Southern horizontal corridor
$corridor5 = @{
    type = "Feature"
    properties = @{
        type = "corridor"
        name = "South Corridor"
    }
    geometry = @{
        type = "LineString"
        coordinates = @(
            @(120.981000, 14.591800),
            @(120.981050, 14.591800),
            @(120.981100, 14.591800),
            @(120.981150, 14.591800),
            @(120.981200, 14.591800),
            @(120.981250, 14.591800),
            @(120.981300, 14.591800),
            @(120.981350, 14.591800),
            @(120.981400, 14.591800),
            @(120.981450, 14.591800),
            @(120.981500, 14.591800),
            @(120.981550, 14.591800),
            @(120.981600, 14.591800)
        )
    }
    id = "corridor-south-horizontal"
}

# Middle horizontal corridor (around Office of President area)
$corridor6 = @{
    type = "Feature"
    properties = @{
        type = "corridor"
        name = "Mid Horizontal Corridor"
    }
    geometry = @{
        type = "LineString"
        coordinates = @(
            @(120.981000, 14.591900),
            @(120.981050, 14.591900),
            @(120.981100, 14.591900),
            @(120.981150, 14.591900),
            @(120.981200, 14.591900),
            @(120.981250, 14.591900),
            @(120.981300, 14.591900),
            @(120.981350, 14.591900),
            @(120.981400, 14.591900),
            @(120.981450, 14.591900),
            @(120.981500, 14.591900),
            @(120.981550, 14.591900),
            @(120.981600, 14.591900),
            @(120.981650, 14.591900)
        )
    }
    id = "corridor-mid-horizontal"
}

# Upper horizontal corridor
$corridor7 = @{
    type = "Feature"
    properties = @{
        type = "corridor"
        name = "Upper Horizontal Corridor"
    }
    geometry = @{
        type = "LineString"
        coordinates = @(
            @(120.981000, 14.592200),
            @(120.981050, 14.592200),
            @(120.981100, 14.592200),
            @(120.981150, 14.592200),
            @(120.981200, 14.592200),
            @(120.981250, 14.592200),
            @(120.981300, 14.592200),
            @(120.981350, 14.592200),
            @(120.981400, 14.592200),
            @(120.981450, 14.592200),
            @(120.981500, 14.592200),
            @(120.981550, 14.592200),
            @(120.981600, 14.592200)
        )
    }
    id = "corridor-upper-horizontal"
}

# Add all corridors to GeoJSON
$geojson.features += $corridor1
$geojson.features += $corridor2
$geojson.features += $corridor3
$geojson.features += $corridor4
$geojson.features += $corridor5
$geojson.features += $corridor6
$geojson.features += $corridor7

# Save updated GeoJSON
$geojson | ConvertTo-Json -Depth 100 | Set-Content "smart-campus-map.geojson"

Write-Output "✅ Added 7 comprehensive corridor LineStrings"
Write-Output "Total features: $($geojson.features.Count)"
