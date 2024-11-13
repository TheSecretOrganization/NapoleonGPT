// src/components/ConsolePage/EventsLog.tsx

import React, { forwardRef } from 'react'
import { ArrowDown, ArrowUp } from 'react-feather'
import { formatTime } from '~/utils/formatTime'

interface RealtimeEvent {
  time: string
  source: 'client' | 'server'
  count?: number
  event: { [key: string]: any }
  event_id?: string // Ensure event_id exists or handle accordingly
}

interface EventsLogProps {
  events: RealtimeEvent[]
  expandedEvents: { [key: string]: boolean }
  onToggleExpand: (eventId: string) => void
}

export const EventsLog = forwardRef<HTMLDivElement, EventsLogProps>(
  ({ events, expandedEvents, onToggleExpand }, ref) => (
    <div className="content-block events">
      <div className="content-block-title">events</div>
      <div className="content-block-body" ref={ref}>
        {!events.length && `awaiting connection...`}
        {events.map((realtimeEvent) => {
          const { event, time, source, count, event_id } = realtimeEvent
          const isExpanded = event_id ? expandedEvents[event_id] : false

          // Simplify event display
          const displayEvent = { ...event }
          if (event.type === 'input_audio_buffer.append') {
            displayEvent.audio = `[trimmed: ${event.audio.length} bytes]`
          }
          else if (event.type === 'response.audio.delta') {
            displayEvent.delta = `[trimmed: ${event.delta.length} bytes]`
          }

          return (
            <div className="event" key={event_id || Math.random()}>
              <div className="event-timestamp">{formatTime(time)}</div>
              <div className="event-details">
                <div
                  className="event-summary"
                  onClick={() => event_id && onToggleExpand(event_id)}
                >
                  <div
                    className={`event-source ${
                      event.type === 'error' ? 'error' : source
                    }`}
                  >
                    {source === 'client' ? <ArrowUp /> : <ArrowDown />}
                    <span>{event.type === 'error' ? 'error!' : source}</span>
                  </div>
                  <div className="event-type">
                    {event.type}
                    {count && ` (${count})`}
                  </div>
                </div>
                {isExpanded && (
                  <pre className="event-payload">
                    {JSON.stringify(displayEvent, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  ),
)
