// src/components/ConsolePage/ConsolePage.tsx

import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js'
import { RealtimeClient } from '@openai/realtime-api-beta'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Controls } from '~/components/controls/Controls'
import { ConversationLog } from '~/components/convLog/ConversationLog'
import { EventsLog } from '~/components/eventLog/EventsLog'
import { Header } from '~/components/header/Header'
import { Visualization } from '~/components/visualization/Visualization'
// Removed unnecessary imports
// import { WeatherMap } from '~/components/weather/WeatherMap'
// import { MemoryDisplay } from '~/components/memory/MemoryDisplay'
// import { useRealtimeTools } from '~/hooks/useRealtimeTools'
import { WavRecorder, WavStreamPlayer } from '~/lib/wavtools'
import { instructions } from '~/utils/conversation_config'
import './ConsolePage.scss'

const LOCAL_RELAY_SERVER_URL: string = ''

// Removed unused interfaces
// interface Coordinates {
//   lat: number
//   lng: number
//   location?: string
//   temperature?: { value: number; units: string }
//   wind_speed?: { value: number; units: string }
// }

interface RealtimeEvent {
  time: string
  source: 'client' | 'server'
  count?: number
  event: { [key: string]: any }
  event_id?: string // Assuming event_id exists
}

export function ConsolePage() {
  // API Key Management
  const apiKey =
      LOCAL_RELAY_SERVER_URL ? '' : localStorage.getItem('tmp::voice_api_key') || prompt('OpenAI API Key') || ''
  if (apiKey !== '') {
    localStorage.setItem('tmp::voice_api_key', apiKey)
  }

  // Refs
  const wavRecorderRef = useRef<WavRecorder>(new WavRecorder({ sampleRate: 24000 }))
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(new WavStreamPlayer({ sampleRate: 24000 }))
  const clientRef = useRef<RealtimeClient>(
      new RealtimeClient(
          LOCAL_RELAY_SERVER_URL
              ? { url: LOCAL_RELAY_SERVER_URL }
              : { apiKey, dangerouslyAllowAPIKeyInBrowser: true }
      )
  )

  // State Management
  const [items, setItems] = useState<ItemType[]>([])
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([])
  const [expandedEvents, setExpandedEvents] = useState<{ [key: string]: boolean }>({})
  const [isConnected, setIsConnected] = useState(false)
  const [canPushToTalk, setCanPushToTalk] = useState(true)
  const [isRecording, setIsRecording] = useState(false)

  // Removed memoryKv, coords, marker
  // const [memoryKv, setMemoryKv] = useState<{ [key: string]: any }>({})
  // const [coords, setCoords] = useState<Coordinates | null>({ lat: 37.775593, lng: -122.418137 })
  // const [marker, setMarker] = useState<Coordinates | null>(null)

  const startTimeRef = useRef<string>(new Date().toISOString())

  // New states for images
  const [victorHugoImage, setVictorHugoImage] = useState<string>('')
  const [bookImage, setBookImage] = useState<string>('')

  // List of Victor Hugo's books
  const victorHugoBooks = [
    'Les Misérables',
    'The Hunchback of Notre-Dame',
    'Toilers of the Sea',
    'The Man Who Laughs',
    'Ninety-Three',
    'Les Travailleurs de la Mer',
    'Bug-Jargal',
    'Hans of Iceland',
    'The Last Day of a Condemned Man',
    'Claude Gueux',
    'Cromwell'
  ]

  // Removed custom hook useRealtimeTools since it's no longer needed
  // useRealtimeTools({ client: clientRef.current, setMemoryKv, setMarker, setCoords })

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
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !prev[eventId]
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
        text: `Hello!`
      }
    ])

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono))
    }
  }, [])

  const disconnectConversation = useCallback(async () => {
    setIsConnected(false)
    setRealtimeEvents([])
    setItems([])
    // Removed resetting of memoryKv, coords, marker
    // setMemoryKv({})
    // setCoords({ lat: 37.775593, lng: -122.418137 })
    // setMarker(null)
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
    await wavRecorder.record((data) => client.appendInputAudio(data.mono))
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
      turn_detection: value === 'none' ? null : { type: 'server_vad' }
    })

    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono))
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
    const conversationEls = [].slice.call(document.body.querySelectorAll('[data-conversation-content]'))
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement
      conversationEl.scrollTop = conversationEl.scrollHeight
    }
  }, [items])

  // Fetch Victor Hugo image on component mount
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

  // Detect when assistant talks about Victor Hugo's books
  const [lastProcessedAssistantMessageId, setLastProcessedAssistantMessageId] = useState<string>('')

  interface TextContentType {
    type: 'text';
    text: string;
  }

  interface AudioContentType {
    type: 'audio';
    // Define other properties relevant to audio content
    // For example:
    // audio: ArrayBuffer;
  }

  useEffect(() => {
    if (items.length > 0) {
      const lastItem = items[items.length - 1];

      if (
          lastItem.id !== lastProcessedAssistantMessageId &&
          lastItem.role === 'assistant' &&
          'content' in lastItem &&
          Array.isArray(lastItem.content)
      ) {
        // Find the first content element that is of type 'text'
        console.log(lastItem.formatted.transcript);

        const textContent = lastItem.formatted.transcript;

        if (textContent && textContent) {
          const text = textContent;
          console.log('Assistant said:', text);

          const mentionedBook = victorHugoBooks.find((book) =>
              text.toLowerCase().includes(book.toLowerCase())
          );

          if (mentionedBook) {
            console.log('Assistant mentioned book:', mentionedBook);
            fetchBookImage(mentionedBook);
          } else {
            console.log('No Victor Hugo book mentioned');
          }
        } else {
          console.log('No text content found in last assistant message');
        }

        setLastProcessedAssistantMessageId(lastItem.id);
      }
    }
  }, [items]);

  const fetchBookImage = async (bookTitle: string) => {
    try {
      const formattedTitle = encodeURIComponent(bookTitle);
      const response = await fetch(
          `https://openlibrary.org/search.json?title=${formattedTitle}&author=Victor+Hugo`
      );
      const data = await response.json();

      if (data.numFound > 0 && data.docs[0].cover_i) {
        const coverId = data.docs[0].cover_i;
        const imageUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
        setBookImage(imageUrl);
      } else {
        console.error('No image found for', bookTitle);
      }
    } catch (error) {
      console.error('Error fetching book image:', error);
    }
  };

  // Visualization Component doesn't need to be handled here as it's encapsulated
  // RealtimeClient and Audio Setup
  useEffect(() => {
    const wavStreamPlayer = wavStreamPlayerRef.current
    const client = clientRef.current

    // Set session parameters
    client.updateSession({ instructions })
    client.updateSession({ voice: 'ash' })
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } })

    // Handle realtime events
    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((prevEvents) => {
        const lastEvent = prevEvents[prevEvents.length - 1]
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          return prevEvents.slice(0, -1).concat({
            ...lastEvent,
            count: (lastEvent.count || 0) + 1
          })
        } else {
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
        const wavFile = await WavRecorder.decode(item.formatted.audio, 24000, 24000)
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
        <Header apiKey={apiKey} onResetApiKey={resetAPIKey} isLocalRelay={!!LOCAL_RELAY_SERVER_URL} />

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
            <ConversationLog items={items} onDeleteItem={deleteConversationItem} />

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
            {/* First Image: Victor Hugo */}
            {victorHugoImage && (
                <img src={victorHugoImage} alt="Victor Hugo" style={{ width: '100%', marginBottom: '20px' }} />
            )}

            {/* Second Image: Book Image */}
            {bookImage && <img src={bookImage} alt="Book Image" style={{ width: '100%' }} />}
          </div>
        </div>
      </div>
  )
}