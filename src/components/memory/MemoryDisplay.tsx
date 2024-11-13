import React from 'react'

interface MemoryDisplayProps {
  memoryKv: { [key: string]: any }
}

export const MemoryDisplay: React.FC<MemoryDisplayProps> = ({ memoryKv }) => (
  <div className="content-block kv">
    <div className="content-block-title">set_memory()</div>
    <div className="content-block-body content-kv">
      <pre>{JSON.stringify(memoryKv, null, 2)}</pre>
    </div>
  </div>
)
