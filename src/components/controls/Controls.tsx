import React from 'react'
import { X, Zap } from 'react-feather'
import { Button } from '~/components/button/Button'
import { Toggle } from '~/components/toggle/Toggle'

interface ControlsProps {
  isConnected: boolean
  canPushToTalk: boolean
  isRecording: boolean
  onConnect: () => void
  onDisconnect: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onToggleMode: (value: string) => void
}

export const Controls: React.FC<ControlsProps> = ({
  isConnected,
  canPushToTalk,
  isRecording,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
  onToggleMode,
}) => (
  <div className="content-actions">
    <Toggle
      defaultValue={false}
      labels={['manual', 'vad']}
      values={['none', 'server_vad']}
      onChange={(_, value) => onToggleMode(value)}
    />
    <div className="spacer" />
    {isConnected && canPushToTalk && (
      <Button
        label={isRecording ? 'release to send' : 'push to talk'}
        buttonStyle={isRecording ? 'alert' : 'regular'}
        disabled={!isConnected || !canPushToTalk}
        onMouseDown={onStartRecording}
        onMouseUp={onStopRecording}
      />
    )}
    <div className="spacer" />
    <Button
      label={isConnected ? 'disconnect' : 'connect'}
      iconPosition={isConnected ? 'end' : 'start'}
      icon={isConnected ? X : Zap}
      buttonStyle={isConnected ? 'regular' : 'action'}
      onClick={isConnected ? onDisconnect : onConnect}
    />
  </div>
)
