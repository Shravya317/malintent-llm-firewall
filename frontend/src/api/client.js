import axios from 'axios'

const BASE_URL = 'https://malintent-backend-261681342014.asia-south1.run.app/api/v1'

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add a request interceptor to include the JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
)

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
 * ACTION LOGS
 * Fetch SEL action logs.
 */
export async function getActionLogs() {
  try {
    const response = await apiClient.get('/action_logs')
    return response.data
  } catch (error) {
    console.error('Error in getActionLogs:', error)
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
export async function simulateRawLLM(presetId, promptText = '') {
  try {
    const payload = promptText || presetId;
    const response = await apiClient.post('/llm/raw', { prompt: payload });
    return response.data.response;
  } catch (error) {
    console.error('Error fetching raw LLM response:', error);
    if (error.response && error.response.data && error.response.data.detail) {
      return `Error: ${error.response.data.detail}`;
    }
    return "Error: Could not connect to the raw LLM API.";
  }
}

/**
 * LOG DECISION UPDATE
 * Sends human review decision to the backend for the False Positive Review Queue.
 */
export async function updateLogDecision(logId, decision) {
  try {
    const response = await apiClient.put(`/logs/${logId}/decision`, {
      human_decision: decision
    })
    return response.data
  } catch (error) {
    console.error('Error updating log decision:', error)
    throw error
  }
}

/**
 * AUTHENTICATION
 */
export async function registerUser(userData) {
  try {
    const response = await apiClient.post('/auth/register', userData)
    return response.data
  } catch (error) {
    console.error('Error in registerUser:', error)
    throw error
  }
}

export async function verifyOTP(email, otp) {
  try {
    const response = await apiClient.post('/auth/verify-otp', { email, otp })
    return response.data
  } catch (error) {
    console.error('Error in verifyOTP:', error)
    throw error
  }
}

export default apiClient
