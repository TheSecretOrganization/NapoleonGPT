import OpenAI from 'openai'
import React, { useEffect, useState } from 'react'
import './ImageDisplay.scss'

interface ImageDisplayProps {
  prompt: string
  api: string
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ prompt, api }) => {
  const [url, setUrl] = useState<string | any>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!prompt)
      return
    const fetchImage = async () => {
      try {
        const openai = new OpenAI({ apiKey: api, dangerouslyAllowBrowser: true })
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
        })
        setUrl(response.data[0].url)
      }
      catch (err) {
        setError('Failed to fetch image.')
        console.error(err)
      }
    }

    fetchImage()
  }, [prompt, api])

  return (
    <div>
      {error
        ? (
            <p>{error}</p>
          )
        : url
          ? (
              <img className="img" src={url} alt="Generated" />
            )
          : (
              <></>
            )}
    </div>
  )
}

export default ImageDisplay
