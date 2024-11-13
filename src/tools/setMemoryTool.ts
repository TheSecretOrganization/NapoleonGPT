// src/tools/setMemoryTool.ts

interface SetMemoryParams {
  key: string
  value: string
}

export const setMemoryTool = {
  name: 'set_memory',
  description: 'Saves important data about the user into memory.',
  parameters: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description:
                    'The key of the memory value. Always use lowercase and underscores, no other characters.',
      },
      value: {
        type: 'string',
        description: 'Value can be anything represented as a string',
      },
    },
    required: ['key', 'value'],
  },
  callback: async (
    params: SetMemoryParams,
    setMemoryKv: React.Dispatch<React.SetStateAction<{ [key: string]: any }>>,
  ) => {
    const { key, value } = params
    setMemoryKv(memoryKv => ({
      ...memoryKv,
      [key]: value,
    }))
    return { ok: true }
  },
}
