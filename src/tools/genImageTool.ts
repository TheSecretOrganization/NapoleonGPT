interface GenImageParams {
  prompt: string
}

export const genImageTool = {
  name: 'gen_image',
  description: 'Illustrate your speech with one image.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description:
            'The prompt of the image to be generated.',
      },
    },
    required: ['prompt'],
  },
  callback: async (
    params: GenImageParams,
    genImageUrl: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    const { prompt } = params
    genImageUrl(prompt)
    return { ok: true }
  },
}
