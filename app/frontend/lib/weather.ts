export const WEATHER_LAYERS = ['temperature', 'precipitation', 'wind', 'pressure', 'clouds'] as const
export type WeatherLayer = (typeof WEATHER_LAYERS)[number]

export interface WeatherLayerMeta {
  label: string
  gradient: string
  minLabel: string
  maxLabel: string
}

export const WEATHER_LAYER_META: Record<WeatherLayer, WeatherLayerMeta> = {
  temperature: {
    label: 'Temperature',
    gradient: 'linear-gradient(to right, #821692, #8257db, #208cec, #23dddd, #c2ff28, #fff028, #fc8014, #c00000)',
    minLabel: '-40 °C',
    maxLabel: '40 °C',
  },
  precipitation: {
    label: 'Precipitation',
    gradient: 'linear-gradient(to right, rgba(120, 120, 190, 0), #7878be, #505dd0, #38a5f0, #4098ff)',
    minLabel: '0 mm',
    maxLabel: '60 mm',
  },
  wind: {
    label: 'Wind speed',
    gradient: 'linear-gradient(to right, rgba(238, 206, 206, 0), #eececc, #b364bc, #744cac, #4600af)',
    minLabel: '0 m/s',
    maxLabel: '100 m/s',
  },
  pressure: {
    label: 'Pressure',
    gradient: 'linear-gradient(to right, #0073ff, #4bd0d6, #b0f720, #f0b800, #fb5515, #f31d64, #742cb0)',
    minLabel: '950 hPa',
    maxLabel: '1070 hPa',
  },
  clouds: {
    label: 'Clouds',
    gradient: 'linear-gradient(to right, rgba(253, 253, 255, 0), rgba(245, 245, 255, 0.7), #f0f0ff)',
    minLabel: '0 %',
    maxLabel: '100 %',
  },
}
