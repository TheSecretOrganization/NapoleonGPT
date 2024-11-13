import React, { useEffect, useRef } from 'react'
import type { WavRecorder, WavStreamPlayer } from '~/lib/wavtools'
import { WavRenderer } from '~/utils/wav_renderer'

interface VisualizationProps {
  wavRecorder: WavRecorder
  wavStreamPlayer: WavStreamPlayer
}

export const Visualization: React.FC<VisualizationProps> = ({ wavRecorder, wavStreamPlayer }) => {
  const clientCanvasRef = useRef<HTMLCanvasElement>(null)
  const serverCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let isLoaded = true
    let clientCtx: CanvasRenderingContext2D | null = null
    let serverCtx: CanvasRenderingContext2D | null = null

    const render = () => {
      if (isLoaded) {
        // Client Visualization
        const clientCanvas = clientCanvasRef.current
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth
            clientCanvas.height = clientCanvas.offsetHeight
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d')
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height)
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) }
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8,
            )
          }
        }

        // Server Visualization
        const serverCanvas = serverCanvasRef.current
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth
            serverCanvas.height = serverCanvas.offsetHeight
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d')
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height)
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) }
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#009900',
              10,
              0,
              8,
            )
          }
        }

        window.requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      isLoaded = false
    }
  }, [wavRecorder, wavStreamPlayer])

  return (
    <div className="visualization">
      <div className="visualization-entry client">
        <canvas ref={clientCanvasRef} />
      </div>
      <div className="visualization-entry server">
        <canvas ref={serverCanvasRef} />
      </div>
    </div>
  )
}
