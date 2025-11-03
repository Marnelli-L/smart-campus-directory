# Buildings Management via Mapbox

You mentioned you manage buildings with Mapbox. This project now treats buildings as map data owned by Mapbox, not CRUDed in the Admin UI.

## What changed

- The Admin "Buildings" tab shows guidance instead of CRUD forms.
- Quick Action for "+ Add Building" was removed.
- Any previous Add/Edit Building modals now point to this guide.

## Options to manage buildings

1. Mapbox Studio (simplest)

- Edit features directly in Studio in a tileset or dataset.
- Keep attributes like: name, category, level/floor, status, tags.
- Publish the style/tileset. The frontend map will reflect updates on next load.

2. Mapbox GL JS + Mapbox-Draw (custom admin map)

- Build a separate admin map page with Mapbox GL JS and Mapbox-GL-Draw.
- Let admins draw/edit polygons and properties (form on the side).
- Save GeoJSON to your backend, then either:
  - Render the GeoJSON as a source layer in the user map, or
  - Push updates into a Mapbox Dataset/Tileset via API.

3. Tilesets API (automated)

- From the backend, use a Mapbox token with Tilesets/Datasets scope.
- Update features programmatically (insert/update/delete) from admin requests.

## Recommended minimal workflow (Studio)

1. Open https://studio.mapbox.com/ and your dataset/tileset for campus buildings.
2. Add/edit polygons and attributes.
3. Publish the tileset and update the style if needed.
4. Reload the user map to see changes.

## Data model suggestions

- id (string): stable identifier
- name (string): building/department name
- category (string): Academic | Administrative | Support | General
- status (string): Open | Temporarily Closed | Under Maintenance
- level (string/number): floor/level when applicable
- tags (array<string>): searchable labels

## Frontend wiring

- In `frontend/src/components/MapView.jsx`, ensure the map loads your Mapbox style and building layer.
- If you switch from Studio tiles to custom GeoJSON from API, replace the source accordingly.

## Next steps (optional)

- Create a separate `/admin-map` page using GL JS + Draw.
- Add a simple form to edit properties of the selected polygon.
- Save to your backend and re-render the map layer.

If you want, I can scaffold the separate admin map page next and wire it to a simple GeoJSON save endpoint.
