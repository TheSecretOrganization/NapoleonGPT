// src/hooks/useRealtimeTools.ts

import type { RealtimeClient } from '@openai/realtime-api-beta'
import { useEffect } from 'react'
import { getWeatherTool } from '~/tools/getWeatherTool'
import { setMemoryTool } from '~/tools/setMemoryTool'

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

interface UseRealtimeToolsProps {
  client: RealtimeClient
  setMemoryKv: React.Dispatch<React.SetStateAction<{ [key: string]: any }>>
  setMarker: React.Dispatch<React.SetStateAction<Coordinates | null>>
  setCoords: React.Dispatch<React.SetStateAction<Coordinates | null>>
}

export function useRealtimeTools({
  client,
  setMemoryKv,
  setMarker,
  setCoords,
}: UseRealtimeToolsProps) {
  useEffect(() => {
    // Register set_memory tool
    client.addTool(
      {
        name: setMemoryTool.name,
        description: setMemoryTool.description,
        parameters: setMemoryTool.parameters,
      },
      async (params: any) => setMemoryTool.callback(params, setMemoryKv),
    )

    // Register get_weather tool
    client.addTool(
      {
        name: getWeatherTool.name,
        description: getWeatherTool.description,
        parameters: getWeatherTool.parameters,
      },
      async (params: any) =>
        getWeatherTool.callback(params, setMarker, setCoords),
    )

    // Cleanup function if necessary
    return () => {
      // If RealtimeClient has a method to remove tools, invoke it here
      // For example:
      // client.removeTool('set_memory');
      // client.removeTool('get_weather');
      // Since it's unclear, we'll leave it as a comment.
    }
  }, [client, setMemoryKv, setMarker, setCoords])
}
