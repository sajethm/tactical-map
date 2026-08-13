import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection } from 'geojson'
import type { Entity } from '@/lib/types'
import type { WeatherLayer } from '@/lib/weather'
import { GROUND, HISTORY, TRACK_COLORS } from '@/lib/palette'
import { registerSymbols, symbolId } from '@/lib/symbology'

// Leader lines project where a contact will be in six minutes, the convention
// marine and air plots use to read speed at a glance.
const LEADER_MINUTES = 6
const LABEL_FONT = ['DIN Offc Pro Medium', 'Arial Unicode MS Regular']

interface Props {
  mapboxToken: string
  entities: Entity[]
  trailPositions: { lat: number; lng: number }[]
  selectedEntityId: number | null
  weatherLayer: WeatherLayer | null
  onEntityClick: (entityId: number) => void
  onMapReady: (map: mapboxgl.Map) => void
  onMoveEnd: (bounds: [number, number, number, number]) => void
}

const entityGeoJSON = (entities: Entity[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: entities.map((e) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [e.lng, e.lat] },
    properties: {
      id: e.id,
      kind: e.kind,
      name: e.name,
      color: TRACK_COLORS[e.kind],
      symbol: symbolId(e.kind, e.status),
      rotation: e.kind === 'marker' ? 0 : e.heading,
    },
  })),
})

const leaderGeoJSON = (entities: Entity[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: entities
    .filter((e) => e.status === 'active' && e.kind !== 'marker' && e.speed_knots > 0.3)
    .map((e) => {
      const nauticalMiles = e.speed_knots * (LEADER_MINUTES / 60)
      const radians = (e.heading * Math.PI) / 180
      const dLat = (nauticalMiles / 60) * Math.cos(radians)
      const dLng = ((nauticalMiles / 60) * Math.sin(radians)) / Math.cos((e.lat * Math.PI) / 180)
      return {
        type: 'Feature',
        properties: { color: TRACK_COLORS[e.kind] },
        geometry: {
          type: 'LineString',
          coordinates: [[e.lng, e.lat], [e.lng + dLng, e.lat + dLat]],
        },
      }
    }),
})

const trailGeoJSON = (positions: { lat: number; lng: number }[]): FeatureCollection => ({
  type: 'FeatureCollection',
  features: positions.length
    ? [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: positions.map((p) => [p.lng, p.lat]) },
      }]
    : [],
})

const selectionFilter = (entityId: number | null) =>
  ['==', ['get', 'id'], entityId ?? -1] as unknown as mapboxgl.FilterSpecification

const WEATHER_SOURCE = 'weather-tiles'

// Inserted before trail-halo (the lowest overlay layer) so weather sits on the
// basemap but under every track, leader and label.
const syncWeatherLayer = (map: mapboxgl.Map, layer: WeatherLayer | null) => {
  if (map.getLayer(WEATHER_SOURCE)) map.removeLayer(WEATHER_SOURCE)
  if (map.getSource(WEATHER_SOURCE)) map.removeSource(WEATHER_SOURCE)
  if (!layer) return
  map.addSource(WEATHER_SOURCE, {
    type: 'raster',
    tiles: [`/weather/tiles/${layer}/{z}/{x}/{y}`],
    tileSize: 256,
    attribution: 'Weather © OpenWeather',
  })
  map.addLayer(
    { id: WEATHER_SOURCE, type: 'raster', source: WEATHER_SOURCE, paint: { 'raster-opacity': 0.55 } },
    'trail-halo',
  )
}

// Pull the basemap toward the console palette so land, water and panels read as
// one instrument rather than a grey map behind a navy app.
type PaintProperty = Parameters<mapboxgl.Map['setPaintProperty']>[1]

const tintBasemap = (map: mapboxgl.Map) => {
  const tints: [string, PaintProperty, string][] = [
    ['background', 'background-color', '#0d1219'],
    ['land', 'background-color', '#0d1219'],
    ['landcover', 'fill-color', '#111823'],
    ['national-park', 'fill-color', '#111823'],
    ['water', 'fill-color', '#070c14'],
    ['waterway', 'line-color', '#0d1520'],
  ]
  tints.forEach(([layer, property, value]) => {
    if (!map.getLayer(layer)) return
    try {
      map.setPaintProperty(layer, property, value)
    } catch {
      // Style layers differ between Mapbox style versions; skip what is absent.
    }
  })
}

export default function MapCanvas({
  mapboxToken,
  entities,
  trailPositions,
  selectedEntityId,
  weatherLayer,
  onEntityClick,
  onMapReady,
  onMoveEnd,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = mapboxToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-63.4, 44.55],
      zoom: 8,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.ScaleControl({ unit: 'nautical', maxWidth: 90 }), 'bottom-left')

    map.on('load', () => {
      tintBasemap(map)
      registerSymbols((id, image, options) => map.addImage(id, image, options))

      map.addSource('entities', { type: 'geojson', data: entityGeoJSON(entities) })
      map.addSource('leaders', { type: 'geojson', data: leaderGeoJSON(entities) })
      map.addSource('trail', { type: 'geojson', data: trailGeoJSON([]) })

      map.addLayer({
        id: 'trail-halo',
        type: 'line',
        source: 'trail',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': HISTORY, 'line-width': 6, 'line-opacity': 0.12, 'line-blur': 3 },
      })
      map.addLayer({
        id: 'trail-line',
        type: 'line',
        source: 'trail',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': HISTORY,
          'line-width': 1.4,
          'line-opacity': 0.8,
          'line-dasharray': [2.5, 2],
        },
      })
      map.addLayer({
        id: 'contact-leaders',
        type: 'line',
        source: 'leaders',
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.2, 'line-opacity': 0.5 },
      })
      map.addLayer({
        id: 'contact-selection',
        type: 'circle',
        source: 'entities',
        filter: selectionFilter(selectedEntityId),
        paint: {
          'circle-radius': 17,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.1,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#dee5ef',
          'circle-stroke-opacity': 0.7,
        },
      })
      map.addLayer({
        id: 'contact-symbols',
        type: 'symbol',
        source: 'entities',
        layout: {
          'icon-image': ['get', 'symbol'],
          'icon-rotate': ['get', 'rotation'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-size': ['interpolate', ['linear'], ['zoom'], 5, 0.7, 9, 0.9, 13, 1],
        },
      })
      map.addLayer({
        id: 'contact-labels',
        type: 'symbol',
        source: 'entities',
        minzoom: 6,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': LABEL_FONT,
          'text-size': 10,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.09,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-optional': true,
          'text-padding': 3,
        },
        paint: {
          'text-color': '#c3cede',
          'text-halo-color': GROUND,
          'text-halo-width': 1.3,
          'text-halo-blur': 0.4,
        },
      })

      map.on('click', 'contact-symbols', (event) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'number') onEntityClick(id)
      })
      map.on('mouseenter', 'contact-symbols', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'contact-symbols', () => {
        map.getCanvas().style.cursor = ''
      })
      loadedRef.current = true
      onMapReady(map)
      reportBounds()
    })

    const reportBounds = () => {
      const b = map.getBounds()
      if (b) onMoveEnd([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }
    map.on('moveend', reportBounds)

    return () => {
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loadedRef.current) return
    const map = mapRef.current
    const entitySource = map?.getSource('entities') as mapboxgl.GeoJSONSource | undefined
    entitySource?.setData(entityGeoJSON(entities))
    const leaderSource = map?.getSource('leaders') as mapboxgl.GeoJSONSource | undefined
    leaderSource?.setData(leaderGeoJSON(entities))
  }, [entities])

  useEffect(() => {
    if (!loadedRef.current) return
    const source = mapRef.current?.getSource('trail') as mapboxgl.GeoJSONSource | undefined
    source?.setData(trailGeoJSON(trailPositions))
  }, [trailPositions])

  useEffect(() => {
    if (!loadedRef.current) return
    mapRef.current?.setFilter('contact-selection', selectionFilter(selectedEntityId))
  }, [selectedEntityId])

  useEffect(() => {
    if (!loadedRef.current || !mapRef.current) return
    syncWeatherLayer(mapRef.current, weatherLayer)
  }, [weatherLayer])

  return <div ref={containerRef} className="h-full w-full" />
}
