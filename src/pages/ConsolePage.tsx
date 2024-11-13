// src/components/ConsolePage/ConsolePage.tsx

import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js'
import { RealtimeClient } from '@openai/realtime-api-beta'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Controls } from '~/components/controls/Controls'
import { ConversationLog } from '~/components/convLog/ConversationLog'
import { EventsLog } from '~/components/eventLog/EventsLog'
import ImageDisplay from '~/components/genimage/ImageDisplay'
import { Header } from '~/components/header/Header'
import { MemoryDisplay } from '~/components/memory/MemoryDisplay'
import { Visualization } from '~/components/visualization/Visualization'
import { WeatherMap } from '~/components/weather/WeatherMap'
import { useRealtimeTools } from '~/hooks/useRealtimeTools'
import { WavRecorder, WavStreamPlayer } from '~/lib/wavtools'
import { instructions } from '~/utils/conversation_config'
import './ConsolePage.scss'
import OpenAI from 'openai'
import { z } from 'zod'
import { zodResponseFormat } from 'openai/helpers/zod'

const LOCAL_RELAY_SERVER_URL: string = ''

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

const Book = z.object({
  title: z.string(),
  release: z.number(),
  description: z.string()
})

interface RealtimeEvent {
  time: string
  source: 'client' | 'server'
  count?: number
  event: { [key: string]: any }
  event_id?: string // Assuming event_id exists
}

export function ConsolePage() {
  const [victorHugoImage, setVictorHugoImage] = useState<string>('')
  // API Key Management
  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ''
    : localStorage.getItem('tmp::voice_api_key')
      || prompt('OpenAI API Key')
      || ''
  if (apiKey !== '') {
    localStorage.setItem('tmp::voice_api_key', apiKey)
  }

  // Refs
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 }),
  )
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 }),
  )
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          },
    ),
  )

  // State Management
  const [items, setItems] = useState<ItemType[]>([])
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const [expandedEvents, setExpandedEvents] = useState<{ [key: string]: boolean }>({})
  const [isConnected, setIsConnected] = useState(false)
  const [canPushToTalk, setCanPushToTalk] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({})
  const [imageUrl, genImageUrl] = useState<string>('')
  const [coords, setCoords] = useState<Coordinates | null>({
    lat: 37.775593,
    lng: -122.418137,
  })
  const [book, setBook] = useState<any>(null)
  const [marker, setMarker] = useState<Coordinates | null>(null)

  const startTimeRef = useRef<string>(new Date().toISOString())

  // Custom Hook for Tool Management
  useRealtimeTools({
    client: clientRef.current,
    setMemoryKv,
    setMarker,
    setCoords,
    genImageUrl,
    apiKey,
  })

  // Utility Functions
  const resetAPIKey = useCallback(() => {
    const newApiKey = prompt('OpenAI API Key')
    if (newApiKey !== null) {
      localStorage.clear()
      localStorage.setItem('tmp::voice_api_key', newApiKey)
      window.location.reload()
    }
  }, [])

  const deleteConversationItem = useCallback((id: string) => {
    const client = clientRef.current
    client.deleteItem(id)
  }, [])

  const onToggleExpand = useCallback((eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId],
    }))
  }, [])

  // Connection Handlers
  const connectConversation = useCallback(async () => {
    const client = clientRef.current
    const wavRecorder = wavRecorderRef.current
    const wavStreamPlayer = wavStreamPlayerRef.current

    // Set state variables
    startTimeRef.current = new Date().toISOString()
    setIsConnected(true)
    setRealtimeEvents([])
    setItems(client.conversation.getItems())

    // Connect to microphone
    await wavRecorder.begin()

    // Connect to audio output
    await wavStreamPlayer.connect()

    // Connect to realtime API
    await client.connect()
    client.sendUserMessageContent([
      {
        type: `input_text`,
        text: `Hello!`,
      },
    ])

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record(data => client.appendInputAudio(data.mono))
    }
  }, [])

  const disconnectConversation = useCallback(async () => {
    setIsConnected(false)
    setRealtimeEvents([])
    setItems([])
    setMemoryKv({})
    setCoords({
      lat: 37.775593,
      lng: -122.418137,
    })
    setMarker(null)

    const client = clientRef.current
    client.disconnect()

    const wavRecorder = wavRecorderRef.current
    await wavRecorder.end()

    const wavStreamPlayer = wavStreamPlayerRef.current
    await wavStreamPlayer.interrupt()
  }, [])

  // Recording Handlers
  const startRecording = async () => {
    setIsRecording(true)
    const client = clientRef.current
    const wavRecorder = wavRecorderRef.current
    const wavStreamPlayer = wavStreamPlayerRef.current
    const trackSampleOffset = await wavStreamPlayer.interrupt()
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset
      await client.cancelResponse(trackId, offset)
    }
    await wavRecorder.record(data => client.appendInputAudio(data.mono))
  }

  const stopRecording = async () => {
    setIsRecording(false)
    const client = clientRef.current
    const wavRecorder = wavRecorderRef.current
    await wavRecorder.pause()
    client.createResponse()
  }

  // Toggle Mode Handler
  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current
    const wavRecorder = wavRecorderRef.current
    if (value === 'none' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause()
    }
    client.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    })
    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.record(data => client.appendInputAudio(data.mono))
    }
    setCanPushToTalk(value === 'none')
  }

  // Auto-scroll Effect for Events
  const eventsScrollHeightRef = useRef(0)
  const eventsScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current
      const scrollHeight = eventsEl.scrollHeight
      // Only scroll if height has just changed
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight
        eventsScrollHeightRef.current = scrollHeight
      }
    }
  }, [realtimeEvents])

  // Auto-scroll Effect for Conversation
  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll('[data-conversation-content]'),
    )
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement
      conversationEl.scrollTop = conversationEl.scrollHeight
    }
  }, [items])

  // Visualization Component doesn't need to be handled here as it's encapsulated
  useEffect(() => {
    const fetchVictorHugoImage = async () => {
      try {
        const response = await fetch(
            'https://en.wikipedia.org/w/api.php?action=query&titles=Victor%20Hugo&prop=pageimages&format=json&pithumbsize=500&origin=*'
        )
        const data = await response.json()
        const pageId = Object.keys(data.query.pages)[0]
        const imageUrl = data.query.pages[pageId].thumbnail.source
        setVictorHugoImage(imageUrl)
      } catch (error) {
        console.error('Error fetching Victor Hugo image:', error)
      }
    }
    fetchVictorHugoImage()
  }, [])

  // RealtimeClient and Audio Setup
  useEffect(() => {
    const wavStreamPlayer = wavStreamPlayerRef.current
    const client = clientRef.current

    // Set session parameters
    client.updateSession({ instructions })
    client.updateSession({ voice: 'ash' })
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } })

    client.addTool(
      {
        "name": "describe_books",
        "description": "Décris les livres dont tu parles",
        "parameters": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string",
              "description": "Le titre du livre"
            },
            "genre": {
              "type": "string",
              "description": "Le genre littéraire du livre"
            },
            "publication_year": {
              "type": "number",
              "description": "L'année de publication du livre"
            },
            "summary": {
              "type": "string",
              "description": "Un résumé du contenu du livre"
            }
          },
          "required": [
            "title",
            "genre",
            "summary"
          ]
        }
      },
      async ({title, genre, release, summary}: any) => {
        setBook({
          title: title,
          genre: genre,
          release: release,
          summary: summary,
        })
      }
    )

    // Handle realtime events
    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((prevEvents) => {
        const lastEvent = prevEvents[prevEvents.length - 1]
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          return prevEvents.slice(0, -1).concat({
            ...lastEvent,
            count: (lastEvent.count || 0) + 1,
          })
        }
        else {
          return [...prevEvents, realtimeEvent]
        }
      })
    })

    client.on('error', (event: any) => console.error(event))

    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt()
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset
        await client.cancelResponse(trackId, offset)
      }
    })

    client.on('conversation.updated', async ({ item, delta }: any) => {
      const items = client.conversation.getItems()
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id)
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000,
        )
        item.formatted.file = wavFile
      }
      setItems(items)
    })

    setItems(client.conversation.getItems())

    return () => {
      client.reset()
    }
  }, [])

  return (
    <div data-component="ConsolePage">
      {/* Header */}
      <Header
        apiKey={apiKey}
        onResetApiKey={resetAPIKey}
        isLocalRelay={!!LOCAL_RELAY_SERVER_URL}
      />

      {/* Main Content */}
      <div className="content-main">
        {/* Logs Section */}
        <div className="content-logs">
          {/* Visualization */}
          <Visualization
            wavRecorder={wavRecorderRef.current}
            wavStreamPlayer={wavStreamPlayerRef.current}
          />

          {/* Events Log */}
          <EventsLog
            events={realtimeEvents}
            expandedEvents={expandedEvents}
            onToggleExpand={onToggleExpand}
            ref={eventsScrollRef}
          />

          {/* Conversation Log */}
          <ConversationLog
            items={items}
            onDeleteItem={deleteConversationItem}
          />

          {/* Controls */}
          <Controls
            isConnected={isConnected}
            canPushToTalk={canPushToTalk}
            isRecording={isRecording}
            onConnect={connectConversation}
            onDisconnect={disconnectConversation}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onToggleMode={changeTurnEndType}
          />
        </div>

        {/* Sidebar */}
        <div className="content-right">
          {victorHugoImage && (
              <img src={victorHugoImage} alt="Victor Hugo" style={{ width: '100%', marginBottom: '20px' }} />
          )}
          <ImageDisplay prompt={imageUrl} api={apiKey} />
          <ShowBook book={book} />
        </div>
      </div>
    </div>
  )
}

export function ShowBook(book: any) {
  console.log(book)
  if (book.book == null)
    return (<></>)
  return (
    <>
      <p>Title {book.book.title}</p>
      <p>Genre {book.book.genre}</p>
    </>
  )
}
