// src/tools/getWeatherTool.ts

interface GetWeatherParams {
  lat: number
  lng: number
  location: string
}

interface Coordinates {
  lat: number
  lng: number
  location?: string
  temperature?: {
    value: number
    units: string
  }
  wind_speed?: {
    value: number
    units: string
  }
}

export const getWeatherTool = {
  name: 'get_weather',
  description:
      'Retrieves the weather for a given lat, lng coordinate pair. Specify a label for the location.',
  parameters: {
    type: 'object',
    properties: {
      lat: {
        type: 'number',
        description: 'Latitude',
      },
      lng: {
        type: 'number',
        description: 'Longitude',
      },
      location: {
        type: 'string',
        description: 'Name of the location',
      },
    },
    required: ['lat', 'lng', 'location'],
  },
  callback: async (
    params: GetWeatherParams,
    setMarker: React.Dispatch<React.SetStateAction<Coordinates | null>>,
    setCoords: React.Dispatch<React.SetStateAction<Coordinates | null>>,
  ) => {
    const { lat, lng, location } = params
    setMarker({ lat, lng, location })
    setCoords({ lat, lng, location })

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`,
      )

      if (!response.ok) {
        throw new Error('Failed to fetch weather data.')
      }

      const json = await response.json()
      const temperature = {
        value: json.current_weather.temperature as number,
        units: '°C', // Adjust as needed based on API response
      }
      const wind_speed = {
        value: json.current_weather.windspeed as number,
        units: 'km/h', // Adjust as needed based on API response
      }

      // Ensure lat and lng are preserved
      setMarker((prev) => {
        if (prev) {
          return {
            ...prev,
            temperature,
            wind_speed,
          }
        }
        else {
          // Fallback in case prev is null, though it shouldn't be
          return {
            lat,
            lng,
            location,
            temperature,
            wind_speed,
          }
        }
      })

      return json
    }
    catch (error) {
      console.error('Error fetching weather data:', error)
      return { error: 'Failed to retrieve weather data.' }
    }
  },
}
