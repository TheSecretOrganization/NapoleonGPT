import React from 'react'
import { Edit } from 'react-feather'
import { Button } from '~/components/button/Button'

interface HeaderProps {
  apiKey: string
  onResetApiKey: () => void
  isLocalRelay: boolean
}

export const Header: React.FC<HeaderProps> = ({ apiKey, onResetApiKey, isLocalRelay }) => (
  <div className="content-top">
    <div className="content-title">
      <img src="/hugo-icon.png" alt="HugoGPT Logo" />
      <span>HugoGPT</span>
    </div>
    <div className="content-api-key">
      {!isLocalRelay && (
        <Button
          icon={Edit}
          iconPosition="end"
          buttonStyle="flush"
          label={`api key: ${apiKey.slice(0, 3)}...`}
          onClick={onResetApiKey}
        />
      )}
    </div>
  </div>
)
