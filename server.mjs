import express from 'express'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'

dotenv.config({ path: '.env.server.local' })

const app = express()
const port = 3001
const flagsmithApiUrl = 'https://api.flagsmith.com/api/v1'

app.use(express.json({ limit: '20kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, service: 'flagpilot-ai' })
})

async function flagsmithRequest(path, options = {}) {
  const apiResponse = await fetch(`${flagsmithApiUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Api-Key ${process.env.FLAGSMITH_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await apiResponse.json().catch(() => ({}))
  if (!apiResponse.ok) {
    const message = data.detail || data.name?.[0] || 'Flagsmith rejected the request.'
    const error = new Error(message)
    error.status = apiResponse.status
    throw error
  }
  return data
}

app.post('/api/plan', async (request, response) => {
  const featureRequest = request.body?.featureRequest?.trim()
  const successMetric = request.body?.successMetric?.trim()

  if (!featureRequest || !successMetric) {
    return response.status(400).json({
      error: 'A feature request and success metric are required.',
    })
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({ error: 'Gemini is not configured.' })
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `You are FlagPilot, a cautious feature-release assistant.

Feature request: ${featureRequest}
Success metric: ${successMetric}

Create a practical Flagsmith rollout plan. Choose a safe starting percentage based on risk. The flag name must use only lowercase letters, numbers and underscores. Keep every explanation short and clear. Never claim that a change has already been made.`,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          required: ['flagName', 'riskLevel', 'rollout', 'metric', 'safetyRule', 'reasoning'],
          properties: {
            flagName: { type: 'string' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            rollout: { type: 'string' },
            metric: { type: 'string' },
            safetyRule: { type: 'string' },
            reasoning: { type: 'string' },
          },
        },
      },
    })

    const plan = JSON.parse(result.text)
    return response.json(plan)
  } catch (error) {
    console.error('Gemini plan generation failed:', error.message)
    return response.status(502).json({
      error: 'The AI could not prepare a plan. Please try again.',
    })
  }
})

app.post('/api/approve', async (request, response) => {
  const flagName = request.body?.flagName
    ?.toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
  const reasoning = request.body?.reasoning?.trim().slice(0, 500)

  if (!flagName || !reasoning) {
    return response.status(400).json({ error: 'A valid plan is required.' })
  }
  if (!process.env.FLAGSMITH_API_TOKEN) {
    return response.status(500).json({ error: 'Flagsmith management is not configured.' })
  }

  try {
    const projectResult = await flagsmithRequest('/projects/')
    const projects = projectResult.results || projectResult
    const project = projects.find((item) => item.name === 'FlagPilot')

    if (!project) {
      return response.status(404).json({ error: 'The FlagPilot project was not found.' })
    }

    const featureResult = await flagsmithRequest(`/projects/${project.id}/features/`)
    const features = featureResult.results || featureResult
    const existingFeature = features.find((item) => item.name === flagName)

    if (existingFeature) {
      return response.json({
        created: false,
        featureId: existingFeature.id,
        flagName,
        message: 'This flag already exists in Flagsmith.',
      })
    }

    const feature = await flagsmithRequest(`/projects/${project.id}/features/`, {
      method: 'POST',
      body: JSON.stringify({
        name: flagName,
        description: `Created by FlagPilot after human approval. ${reasoning}`,
        default_enabled: false,
        initial_value: null,
      }),
    })

    return response.status(201).json({
      created: true,
      featureId: feature.id,
      flagName: feature.name,
      message: 'Flag created safely in Flagsmith and left disabled.',
    })
  } catch (error) {
    console.error('Flagsmith approval failed:', error.message)
    return response.status(error.status || 502).json({
      error: `Flagsmith could not create the flag: ${error.message}`,
    })
  }
})

app.listen(port, () => {
  console.log(`FlagPilot AI server running on http://localhost:${port}`)
})
