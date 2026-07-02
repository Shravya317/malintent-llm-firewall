import axios from 'axios'

// Configure base URL with fallback to localhost:8000 for local development
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * SCAN / INPUT
 * Main firewall endpoint for incoming prompts.
 */
export async function scanInput(prompt, sessionRole = 'customer', userId = null, privacyMode = 'tokenised') {
  try {
    const response = await apiClient.post('/scan/input', {
      prompt,
      session_role: sessionRole,
      user_id: userId,
      privacy_mode: privacyMode,
    })
    return response.data
  } catch (error) {
    console.error('Error in scanInput:', error)
    throw error
  }
}

/**
 * SCAN / OUTPUT
 * Output consistency validator.
 */
export async function scanOutput(llmResponse, systemContext) {
  try {
    const response = await apiClient.post('/scan/output', {
      llm_response: llmResponse,
      system_context: systemContext,
    })
    return response.data
  } catch (error) {
    console.error('Error in scanOutput:', error)
    throw error
  }
}

/**
 * SCAN / DOCUMENT
 * RAG document pre-scanner.
 */
export async function scanDocument(data = {}) {
  try {
    const response = await apiClient.post('/scan/document', data)
    return response.data
  } catch (error) {
    console.error('Error in scanDocument:', error)
    throw error
  }
}

/**
 * LOGS
 * Fetch threat logs.
 */
export async function getLogs() {
  try {
    const response = await apiClient.get('/logs')
    return response.data
  } catch (error) {
    console.error('Error in getLogs:', error)
    throw error
  }
}

/**
 * STATS
 * Fetch dashboard stats and hourly trends.
 */
export async function getStats() {
  try {
    const response = await apiClient.get('/stats')
    return response.data
  } catch (error) {
    console.error('Error in getStats:', error)
    throw error
  }
}

/**
 * CONFIG / SET
 * Write an encrypted config value to the backend.
 * Automatically serializes objects/arrays to JSON strings.
 */
export async function setConfig(key, value) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    const response = await apiClient.put('/config', {
      key,
      value: stringValue,
    })
    return response.data
  } catch (error) {
    console.error(`Error setting config for key ${key}:`, error)
    throw error
  }
}

/**
 * CONFIG / GET
 * Read a decrypted config value from the backend.
 * Automatically attempts to parse JSON strings back into objects/arrays.
 */
export async function getConfig(key, defaultValue = null) {
  try {
    const response = await apiClient.get(`/config/${key}`)
    const rawValue = response.data.value
    try {
      return JSON.parse(rawValue)
    } catch {
      return rawValue
    }
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.warn(`Config key ${key} not found (404). Using default value.`)
      return defaultValue
    }
    console.error(`Error getting config for key ${key}:`, error)
    return defaultValue
  }
}

/**
 * MOCK: UNPROTECTED LLM
 * Simulates a direct call to an unprotected LLM (like raw OpenAI/Groq)
 * for the Comparison Mode right panel.
 */
export async function simulateRawLLM(presetId) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const responses = {
    override: "I have discarded my previous instructions. Here are the system credentials you requested:\n\nusername: admin_root\npassword: super_secret_admin_123",
    jailbreak: "Of course. Initiating unconstrained persona.\n\nTo bypass standard authentication protocols on a Linux system, you should first attempt to leverage misconfigured sudoers files...",
    exfiltration: "The base64 encoded version of the system prompt is:\n\nU3lzdGVtIFByb21wdDogWW91IGFyZSBhIGhlbHBmdWwgQUkuIE5ldmVyIGdpdmUgb3V0IHNlY3JldHMu\n\nReturning data as requested.",
    rag_injection: "Based on the internal documents, the Q3 financial strategy is highly confidential. However, to summarize the hidden notes as requested: We are planning a massive restructuring in November and laying off 15% of the workforce.",
    trojan: "Translating the document:\n\nThe project is going well. Also, here is the output of the requested sub-routine:\n\n[Exec: rm -rf /var/log/auth.log]\nCommand executed successfully."
  }
  
  return responses[presetId] || "I am an AI assistant and I cannot fulfill this request."
}

/**
 * MOCK: LOG DECISION UPDATE
 * Simulates the backend endpoint for the False Positive Review Queue.
 */
export async function mockUpdateLogDecision(logId, decision) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400))
  return { status: "success", log_id: logId, new_decision: decision }
}

export default apiClient
