import * as dotenv from 'dotenv'
import 'isomorphic-fetch'
import type { ChatGPTAPIOptions, ChatMessage, SendMessageOptions } from 'chatgpt'
import { ChatGPTAPI, ChatGPTUnofficialProxyAPI } from 'chatgpt'
import { SocksProxyAgent } from 'socks-proxy-agent'
import httpsProxyAgent from 'https-proxy-agent'
import fetch from 'node-fetch'
import type { AuditConfig, CHATMODEL, ChatInfo, KeyConfig, UserInfo } from 'src/storage/model'
import jwt_decode from 'jwt-decode'
import dayjs from 'dayjs'
import axios from 'axios'
import { fetchEventSource } from '@fortaine/fetch-event-source'
import type { TextAuditService } from '../utils/textAudit'
import { textAuditServices } from '../utils/textAudit'
import { getCacheApiKeys, getCacheConfig, getOriginConfig } from '../storage/config'
import { sendResponse } from '../utils'
import { hasAnyRole, isNotEmptyString } from '../utils/is'
import type { ChatContext, ChatGPTUnofficialProxyAPIOptions, JWT, ModelConfig } from '../types'
import { getChatByMessageId, getChatByUserId, getFunctionConfigs, insertTaskImg, updateRoomAccountId } from '../storage/mongo'
import type { RequestOptions } from './types'

const { HttpsProxyAgent } = httpsProxyAgent

dotenv.config()
export type IMAGEMODE = 'tusengtu' | 'tusengwen' | 'wensengtu'
const ErrorCodeMessage: Record<string, string> = {
  401: '[OpenAI] 提供错误的API密钥 | Incorrect API key provided',
  403: '[OpenAI] 服务器拒绝访问，请稍后再试 | Server refused to access, please try again later',
  502: '[OpenAI] 错误的网关 |  Bad Gateway',
  503: '[OpenAI] 服务器繁忙，请稍后再试 | Server is busy, please try again later',
  504: '[OpenAI] 网关超时 | Gateway Time-out',
  500: '[OpenAI] 服务器繁忙，请稍后再试 | Internal Server Error',
}

let auditService: TextAuditService
const _lockedKeys: { key: string; lockedTime: number }[] = []

export async function initApi(key: KeyConfig, chatModel: CHATMODEL) {
  // More Info: https://github.com/transitive-bullshit/chatgpt-api

  const config = await getCacheConfig()
  const model = chatModel as string

  if (key.keyModel === 'ChatGPTAPI') {
    const OPENAI_API_BASE_URL = config.apiBaseUrl

    const options: ChatGPTAPIOptions = {
      apiKey: key.key,
      completionParams: { model },
      debug: !config.apiDisableDebug,
      messageStore: undefined,
      getMessageById,
      maxModelTokens: config.maxModelTokens,
      maxResponseTokens: config.maxResponseTokens,
    }
    // Set the token limits based on the model's type. This is because different models have different token limits.
    // The token limit includes the token count from both the message array sent and the model response.
    // 'gpt-35-turbo' has a limit of 4096 tokens, 'gpt-4' and 'gpt-4-32k' have limits of 8192 and 32768 tokens respectively.

    // Check if the model type includes '16k'
    if (model.toLowerCase().includes('16k')) {
      // If it's a '16k' model, set the maxModelTokens to 16384 and maxResponseTokens to 4096
      options.maxModelTokens = 16384
      options.maxResponseTokens = 4096
    }
    else if (model.toLowerCase().includes('32k')) {
      // If it's a '32k' model, set the maxModelTokens to 32768 and maxResponseTokens to 8192
      options.maxModelTokens = 32768
      options.maxResponseTokens = 8192
    }
    else if (model.toLowerCase().includes('gpt-4')) {
      // If it's a 'gpt-4' model, set the maxModelTokens and maxResponseTokens to 8192 and 2048 respectively
      options.maxModelTokens = 8192
      options.maxResponseTokens = 2048
    }
    else {
      // If none of the above, use the default values, set the maxModelTokens and maxResponseTokens to 8192 and 2048 respectively
      options.maxModelTokens = 4096
      options.maxResponseTokens = 1024
    }

    if (isNotEmptyString(OPENAI_API_BASE_URL))
      options.apiBaseUrl = `${OPENAI_API_BASE_URL}/v1`

    await setupProxy(options)

    return new ChatGPTAPI({ ...options })
  }
  else {
    const options: ChatGPTUnofficialProxyAPIOptions = {
      accessToken: key.key,
      apiReverseProxyUrl: isNotEmptyString(config.reverseProxy) ? config.reverseProxy : 'https://ai.fakeopen.com/api/conversation',
      model,
      debug: !config.apiDisableDebug,
    }

    await setupProxy(options)

    return new ChatGPTUnofficialProxyAPI({ ...options })
  }
}

async function createTask(message: string, imageBase64?: string): Promise<string | null> {
  const config = await getCacheConfig()
  const response = await axios.post(`${config.mjApiProxy}/mj/submit/imagine`, {
    prompt: message,
    base64: imageBase64,
    notifyHook: '',
    state: '',
  })

  if (!response?.data)
    return null

  return response.data
}

async function createSimpleChangeTask(taskId: string, action: string): Promise<string | null> {
  console.log(`${taskId},${action}`)
  const config = await getCacheConfig()
  const response = await axios.post(`${config.mjApiProxy}/mj/submit/simple-change`, {
    content: `${taskId} ${action}`,
    notifyHook: '',
    state: '',
  })

  if (!response?.data)
    return null

  return response.data
}

async function createDescribeTask(imageBase64?: string): Promise<string | null> {
  const config = await getCacheConfig()
  const response = await axios.post(`${config.mjApiProxy}/mj/submit/describe`, {
    base64: imageBase64,
    notifyHook: '',
    state: '',
  })

  if (!response?.data?.result)
    return null

  return response.data.result
}

async function fetchImageURL(taskId: string): Promise<string | null> {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000))

    try {
      const config = await getCacheConfig()
      const response = await axios.get(`${config.mjApiProxy}/mj/task/${taskId}/fetch`)
      if (!response?.data)
        return null
      // eslint-disable-next-line no-console
      console.log(response)
      if (response.data?.status === 'FAILURE' || response.data?.status === 'SUCCESS' || (response.data?.status === 'IN_PROGRESS' && response.data.imageUrl && response.data.imageUrl.trim() !== ''))
        return response.data
    }
    catch (error) {}
  }
}

async function draw({ userId, message, imageBase64, imageType, process, transMsg, imgOperation, changeTaskId }: { userId: string;message: string; imageBase64: string; imageType: string; process?: (chat: ChatMessage) => void; transMsg: string ;imgOperation: string; changeTaskId: string }): Promise<ChatMessage> {
  const config = await getCacheConfig()
  // eslint-disable-next-line no-console
  console.log(`开启画图：${imageBase64},${imageType}`)
  let taskId = null
  let imgStatus = null
  let response
  if (imgOperation !== '') {
    response = await createSimpleChangeTask(changeTaskId, imgOperation)
    taskId = response.result
    if (imgOperation === 'V1' || imgOperation === 'V2' || imgOperation === 'V3' || imgOperation === 'V4')
      imgStatus = 'change'
    else
      imgStatus = 'noChange'
  }
  else if (imageType === 'tusengtu') {
    response = await createTask(transMsg, imageBase64)
    taskId = response.result
    imgStatus = 'change'
  }
  else if (imageType === 'tusengwen') {
    response = await createDescribeTask(imageBase64)
    taskId = response.result
    imgStatus = 'noChange'
  }
  else if (imageType === 'wensengtu') {
    response = await createTask(transMsg)
    taskId = response.result
    imgStatus = 'change'
  }
  const text = `**任务名称**: ${message} \n **任务ID**：${taskId} \n **加速生成中**`
  let dataRes = {
    id: taskId,
    conversationId: 'some-conversation-id',
    text,
    detail: null,
    role: null,
    imgResultStatus: null,
    taskId: null,
    imgOperation,
  }
  if (!taskId) {
    console.error('Failed to create task')
    dataRes = {
      ...dataRes,
      text: `**任务名称**: ${message} \n **失败原因**：${response.description}`,
    }
    return dataRes
  }
  process(dataRes)
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const response = await fetchImageURL(taskId)
    if (response === null)
      return null
    if (response?.status === 'FAILURE') {
      dataRes = {
        ...dataRes,
        text: `**任务名称**: ${message} \n **任务ID**：${taskId} \n **失败原因**：${response.failReason}`,
      }
      return dataRes
    }
    const url = config.mjCdnProxy ? response.imageUrl?.replace(/^https:\/\/cdn\.discordapp\.com\//i, config.mjCdnProxy) : response.imageUrl
    let prompt = message
    if (imageType === 'tusengwen')
      prompt = response.prompt
    dataRes = {
      ...dataRes,
      text: `**任务名称**: ${prompt} \n **任务ID**：${taskId} \n **生成进度**：${response.progress} ![我的图片](${url})`,
    }
    process(dataRes)
    if (response?.status === 'SUCCESS') {
      let newTaskId = ''
      if (imgStatus === 'change')
        newTaskId = taskId
      dataRes = {
        ...dataRes,
        text: `**任务名称**: ${prompt} \n **任务ID**：${taskId} \n **生成进度**：${response.progress} ![我的图片](${url})`,
        imgResultStatus: imgStatus,
        taskId: newTaskId,
        imgOperation,
      }
      insertTaskImg(userId, message, taskId)
      return dataRes
    }
  }
}

async function getSinglePicture(userId: string, message: string, taskId: string, action: string) {
  const config = await getCacheConfig()
  const nweTaskId = await createSimpleChangeTask(taskId, action)
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const response = await fetchImageURL(taskId)
    if (response === null)
      return
    if (response?.status === 'FAILURE')
      return
    const url = config.mjCdnProxy ? response.imageUrl?.replace(/^https:\/\/cdn\.discordapp\.com\//i, config.mjCdnProxy) : response.imageUrl
    if (response?.status === 'SUCCESS') {
      insertTaskImg(userId, message, taskId)
      return
    }
  }
}

const processThreads: { userId: string; abort: AbortController; messageId: string }[] = []
async function chatReplyProcess(options: RequestOptions) {
  const model = options.user.config.chatModel
  const key = await getRandomApiKey(options.user, options.user.config.chatModel, options.room.accountId)
  const userId = options.user._id.toString()
  const messageId = options.messageId
  const imageBase64 = options.imageBase64
  const imageType = options.imageType
  const imgOperation = options.imgOperation
  const changeTaskId = options.taskId
  const room = options.room
  const pluginModel = options.pluginModel
  if (key == null || key === undefined)
    throw new Error('没有可用的配置。请再试一次 | No available configuration. Please try again.')

  if (key.keyModel === 'ChatGPTUnofficialProxyAPI') {
    if (!options.room.accountId)
      updateRoomAccountId(userId, options.room.roomId, getAccountId(key.key))

    if (options.lastContext && ((options.lastContext.conversationId && !options.lastContext.parentMessageId)
      || (!options.lastContext.conversationId && options.lastContext.parentMessageId)))
      throw new Error('无法在一个房间同时使用 AccessToken 以及 Api，请联系管理员，或新开聊天室进行对话 | Unable to use AccessToken and Api at the same time in the same room, please contact the administrator or open a new chat room for conversation')
  }

  const { message, lastContext, process, systemMessage, temperature, top_p } = options

  try {
    if (model === 'mid-journey') {
      const transMsg = await translateWithGpt(key, systemMessage, temperature, top_p, message)
      const response = await draw({ userId, message, imageBase64, imageType, process, transMsg, imgOperation, changeTaskId })
      return sendResponse({ type: 'Success', data: response, taskId: response ? response.taskId : null, imgResultStatus: response ? response.imgResultStatus : null, imageAction: response ? response.imgOperation : null })
    }
    if (model === 'plugin' || model === 'auto-gpt' || model === 'gpt-4-vision-preview') {
      const functions = await getFunctionConfigs(userId)
      const array = []
      let auto = false
      if (model === 'auto-gpt')
        auto = true
      const chatInfo = await getChatByUserId(userId, room.roomId)
      for (let i = 0; i < chatInfo.length; i++) {
        const chat = chatInfo[i] as ChatInfo
        // 在这里执行操作，例如打印chat内容
        array.push({ role: 'user', content: chat.prompt })
        if (chat.response)
          array.push({ role: 'assistant', content: chat.response || '无结果' })
      }
      let chatModel = pluginModel
      if (model === 'gpt-4-vision-preview')
        chatModel = model
      const result = await sendMessage(message, functions, array, auto, imageBase64, chatModel, { message, lastContext, process, systemMessage, temperature, top_p } as RequestOptions)
      // const result = await sendMessage(message, functions, array, { message, lastContext, process, systemMessage, temperature, top_p } as RequestOptions)
      return result
    }
    const timeoutMs = (await getCacheConfig()).timeoutMs
    let options: SendMessageOptions = { timeoutMs }

    if (key.keyModel === 'ChatGPTAPI') {
      if (isNotEmptyString(systemMessage))
        options.systemMessage = systemMessage
      options.completionParams = { model, temperature, top_p }
    }

    if (lastContext != null) {
      if (key.keyModel === 'ChatGPTAPI')
        options.parentMessageId = lastContext.parentMessageId
      else
        options = { ...lastContext }
    }
    const api = await initApi(key, model)

    const abort = new AbortController()
    options.abortSignal = abort.signal
    processThreads.push({ userId, abort, messageId })
    const response = await api.sendMessage(message, {
      ...options,
      onProgress: (partialResponse) => {
        process?.(partialResponse)
      },
    })

    return sendResponse({ type: 'Success', data: response })
  }
  catch (error: any) {
    const code = error.statusCode
    if (code === 429 && (error.message.includes('Too Many Requests') || error.message.includes('Rate limit'))) {
      // access token  Only one message at a time
      if (options.tryCount++ < 3) {
        _lockedKeys.push({ key: key.key, lockedTime: Date.now() })
        await new Promise(resolve => setTimeout(resolve, 2000))
        return await chatReplyProcess(options)
      }
    }
    global.console.error(error)
    if (Reflect.has(ErrorCodeMessage, code))
      return sendResponse({ type: 'Fail', message: ErrorCodeMessage[code] })
    return sendResponse({ type: 'Fail', message: error.message ?? 'Please check the back-end console' })
  }
  finally {
    const index = processThreads.findIndex(d => d.userId === userId)
    if (index > -1)
      processThreads.splice(index, 1)
  }
}

async function translateWithGpt(key: KeyConfig, systemMessage: string, temperature: number, top_p: number, message: string) {
  const model: CHATMODEL = 'gpt-3.5-turbo'
  const timeoutMs = (await getCacheConfig()).timeoutMs
  const options: SendMessageOptions = { timeoutMs }

  if (key.keyModel === 'ChatGPTAPI') {
    if (isNotEmptyString(systemMessage))
      options.systemMessage = systemMessage
    options.completionParams = { model, temperature, top_p }
  }
  const api = await initApi(key, model)

  const abort = new AbortController()
  options.abortSignal = abort.signal
  const prompt = `我希望你能担任英语翻译的角色，只回复英文翻译或者原文，不要说任何别的信息。我会用任何语言和你交流，你会识别语言，如果是英文就原封不动返回给我，如果是其他语言就翻译成英文给到我，只回复英文翻译或者原文，不要说任何别的信息。例如我发给你"你好"，你只需回复"hello"，例如我发给你"hello"，你就回复"hello"，不要说任何不相关信息，现在我需要翻译的内容是  "${message}"`
  const response = await api.sendMessage(prompt, {
    ...options,
    onProgress: () => {
    },
  })
  // eslint-disable-next-line no-console
  console.log(response.text)
  return response.text
}

export function abortChatProcess(userId: string) {
  const index = processThreads.findIndex(d => d.userId === userId)
  if (index <= -1)
    return
  const messageId = processThreads[index].messageId
  processThreads[index].abort.abort()
  processThreads.splice(index, 1)
  return messageId
}

export function initAuditService(audit: AuditConfig) {
  if (!audit || !audit.options || !audit.options.apiKey || !audit.options.apiSecret)
    return
  const Service = textAuditServices[audit.provider]
  auditService = new Service(audit.options)
}

async function containsSensitiveWords(audit: AuditConfig, text: string): Promise<boolean> {
  if (audit.customizeEnabled && isNotEmptyString(audit.sensitiveWords)) {
    const textLower = text.toLowerCase()
    const notSafe = audit.sensitiveWords.split('\n').filter(d => textLower.includes(d.trim().toLowerCase())).length > 0
    if (notSafe)
      return true
  }
  if (audit.enabled) {
    if (!auditService)
      initAuditService(audit)
    return await auditService.containsSensitiveWords(text)
  }
  return false
}

async function fetchAccessTokenExpiredTime() {
  const config = await getCacheConfig()
  const jwt = jwt_decode(config.accessToken) as JWT
  if (jwt.exp)
    return dayjs.unix(jwt.exp).format('YYYY-MM-DD HH:mm:ss')
  return '-'
}

let cachedBalance: number | undefined
let cacheExpiration = 0

async function sendMessage(text, functions, array, auto, imageBase64, chatModel, options?: RequestOptions) {
  const config = await getCacheConfig()
  const controller = new AbortController()
  let responseText = ''
  const requestPayload = {
    requestId: '123',
    prompt: text,
    isFunction: true,
    functionNameList: functions,
    messages: array,
    token: config.autoGptToken,
    imageUrl: imageBase64,
    model: chatModel,
  }
  const chatPayload = {
    method: 'POST',
    body: JSON.stringify(requestPayload),
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
    },
    responseType: 'stream',
  }
  let dataRes = {
    id: options.messageId,
    conversationId: 'some-conversation-id',
    text,
    detail: null,
    role: null,
    imgResultStatus: null,
    taskId: null,
  }
  const url = config.autoGptUrl
  let auto_gpt_url = '/ai/chatStream'
  if (auto)
    auto_gpt_url = '/ai/auto/chatStream'
  return new Promise((resolve, reject) => {
    axios.post(`${url}${auto_gpt_url}`, requestPayload, { responseType: 'stream' })
      .then((response) => {
        const reader = response.data

        // 每当有新的数据块可用，触发 'data' 事件
        reader.on('data', (chunk) => {
          if (chunk.toString().startsWith('{') && chunk.toString().endsWith('}')) {
            const str = chunk.toString()
            // eslint-disable-next-line no-console
            console.log(str)
            const obj = JSON.parse(str)
            const content = obj.choices[0].delta.content
            if (content) {
              responseText += content
              dataRes = {
                ...dataRes,
                id: obj.id,
                conversationId: obj.id,
                text: responseText,
              }
              options.process(dataRes)
            }
          }
        })

        // 当所有数据被读取完毕，触发 'end' 事件
        reader.on('end', () => {
          dataRes = {
            ...dataRes,
            text: responseText,
          }
          options.process(dataRes)
          resolve({ status: 'Success', data: dataRes })
        })

        // 当发生错误，触发 'error' 事件
        reader.on('error', (err) => {
          console.error('An error occurred:', err)
        })
      })
      .catch(console.error)
  })
}

async function sendMessage1(text, functions, array, options?: RequestOptions): Promise<unknown> {
  const config = await getCacheConfig()
  return new Promise((resolve, reject) => {
    let responseText = ''
    let finished = false

    const controller = new AbortController()

    let dataRes = {
      id: options.messageId,
      conversationId: 'some-conversation-id',
      text,
      detail: null,
      role: null,
      imgResultStatus: null,
      taskId: null,
    }
    try {
      const requestPayload = {
        requestId: '123',
        prompt: text,
        isFunction: true,
        functionNameList: functions,
        messages: array,
        token: config.autoGptToken,
      }
      const chatPayload = {
        method: 'POST',
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'XMLHttpRequest',
        },
      }
      console.log(chatPayload)
      const REQUEST_TIMEOUT_MS = 150000

      // make a fetch request
      const requestTimeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      )
      const finish = () => {
        if (!finished) {
          dataRes = {
            ...dataRes,
            text: responseText,
          }
          options.process(dataRes)
          finished = true
          resolve({ status: 'Success', data: dataRes })
        }
      }
      controller.signal.onabort = finish
      const url = config.autoGptUrl
      console.log(url)
      fetchEventSource(`${url}/ai/chatStream`, {
        ...chatPayload,
        async onopen(res) {
          clearTimeout(requestTimeoutId)
        },
        onmessage(msg) {
          const message = msg.data
          if (message === '[DONE]' || finished) {
            dataRes = {
              ...dataRes,
              text: responseText,
            }
            finish()
            return
          }
          if (message !== '' && message !== '[DONE]') {
            const obj = JSON.parse(message)
            // 读取 content 字段的值
            const content = obj.choices[0].delta.content
            if (content) {
              responseText += content
              dataRes = {
                ...dataRes,
                id: obj.id,
                conversationId: obj.id,
                text: responseText,
              }
              options.process(dataRes)
            }
          }
        },
        onclose() {
          finish()
        },
        onerror(e) {
          reject(e)
        },
        openWhenHidden: true,
      })
    }
    catch (error: any) {
      console.log(`[Request] failed to make a chat reqeust, ${error}`)
      reject(error)
    }
  })
}

async function fetchBalance() {
  const now = new Date().getTime()
  if (cachedBalance && cacheExpiration > now)
    return Promise.resolve(cachedBalance.toFixed(3))

  // 计算起始日期和结束日期
  const startDate = new Date(now - 90 * 24 * 60 * 60 * 1000)
  const endDate = new Date(now + 24 * 60 * 60 * 1000)

  const config = await getCacheConfig()
  const OPENAI_API_KEY = config.apiKey
  const OPENAI_API_BASE_URL = config.apiBaseUrl

  if (!isNotEmptyString(OPENAI_API_KEY))
    return Promise.resolve('-')

  const API_BASE_URL = isNotEmptyString(OPENAI_API_BASE_URL)
    ? OPENAI_API_BASE_URL
    : 'https://api.openai.com'

  // 查是否订阅
  const urlSubscription = `${API_BASE_URL}/v1/dashboard/billing/subscription`
  // 查普通账单
  // const urlBalance = `${API_BASE_URL}/dashboard/billing/credit_grants`
  // 查使用量
  const urlUsage = `${API_BASE_URL}/v1/dashboard/billing/usage?start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`

  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  }
  let socksAgent
  let httpsAgent
  if (isNotEmptyString(config.socksProxy)) {
    socksAgent = new SocksProxyAgent({
      hostname: config.socksProxy.split(':')[0],
      port: parseInt(config.socksProxy.split(':')[1]),
      userId: isNotEmptyString(config.socksAuth) ? config.socksAuth.split(':')[0] : undefined,
      password: isNotEmptyString(config.socksAuth) ? config.socksAuth.split(':')[1] : undefined,
    })
  }
  else if (isNotEmptyString(config.httpsProxy)) {
    httpsAgent = new HttpsProxyAgent(config.httpsProxy)
  }

  try {
    // 获取API限额
    let response = await fetch(urlSubscription, { agent: socksAgent === undefined ? httpsAgent : socksAgent, headers })
    if (!response.ok) {
      console.error('您的账户已被封禁，请登录OpenAI进行查看。')
      return
    }
    const subscriptionData = await response.json()
    const totalAmount = subscriptionData.hard_limit_usd

    // 获取已使用量
    response = await fetch(urlUsage, { agent: socksAgent === undefined ? httpsAgent : socksAgent, headers })
    const usageData = await response.json()
    const totalUsage = usageData.total_usage / 100

    // 计算剩余额度
    cachedBalance = totalAmount - totalUsage
    cacheExpiration = now + 60 * 60 * 1000

    return Promise.resolve(cachedBalance.toFixed(3))
  }
  catch (error) {
    global.console.error(error)
    return Promise.resolve('-')
  }
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

async function chatConfig() {
  const config = await getOriginConfig() as ModelConfig
  // if (config.apiModel === 'ChatGPTAPI')
  //   config.balance = await fetchBalance()
  // else
  //   config.accessTokenExpiredTime = await fetchAccessTokenExpiredTime()
  return sendResponse<ModelConfig>({
    type: 'Success',
    data: config,
  })
}

async function setupProxy(options: ChatGPTAPIOptions | ChatGPTUnofficialProxyAPIOptions) {
  const config = await getCacheConfig()
  if (isNotEmptyString(config.socksProxy)) {
    const agent = new SocksProxyAgent({
      hostname: config.socksProxy.split(':')[0],
      port: parseInt(config.socksProxy.split(':')[1]),
      userId: isNotEmptyString(config.socksAuth) ? config.socksAuth.split(':')[0] : undefined,
      password: isNotEmptyString(config.socksAuth) ? config.socksAuth.split(':')[1] : undefined,

    })
    options.fetch = (url, options) => {
      return fetch(url, { agent, ...options })
    }
  }
  else {
    if (isNotEmptyString(config.httpsProxy)) {
      const httpsProxy = config.httpsProxy
      if (httpsProxy) {
        const agent = new HttpsProxyAgent(httpsProxy)
        options.fetch = (url, options) => {
          return fetch(url, { agent, ...options })
        }
      }
    }
  }
}

async function getMessageById(id: string): Promise<ChatMessage | undefined> {
  const isPrompt = id.startsWith('prompt_')
  const chatInfo = await getChatByMessageId(isPrompt ? id.substring(7) : id)

  if (chatInfo) {
    if (isPrompt) { // prompt
      return {
        id,
        conversationId: chatInfo.options.conversationId,
        parentMessageId: chatInfo.options.parentMessageId,
        role: 'user',
        text: chatInfo.prompt,
      }
    }
    else {
      return { // completion
        id,
        conversationId: chatInfo.options.conversationId,
        parentMessageId: `prompt_${id}`, // parent message is the prompt
        role: 'assistant',
        text: chatInfo.response,
      }
    }
  }
  else { return undefined }
}

async function randomKeyConfig(keys: KeyConfig[]): Promise<KeyConfig | null> {
  if (keys.length <= 0)
    return null
  // cleanup old locked keys
  _lockedKeys.filter(d => d.lockedTime <= Date.now() - 1000 * 20).forEach(d => _lockedKeys.splice(_lockedKeys.indexOf(d), 1))

  let unsedKeys = keys.filter(d => _lockedKeys.filter(l => d.key === l.key).length <= 0)
  const start = Date.now()
  while (unsedKeys.length <= 0) {
    if (Date.now() - start > 3000)
      break
    await new Promise(resolve => setTimeout(resolve, 1000))
    unsedKeys = keys.filter(d => _lockedKeys.filter(l => d.key === l.key).length <= 0)
  }
  if (unsedKeys.length <= 0)
    return null
  const thisKey = unsedKeys[Math.floor(Math.random() * unsedKeys.length)]
  return thisKey
}

async function getRandomApiKey(user: UserInfo, chatModel: CHATMODEL, accountId?: string): Promise<KeyConfig | undefined> {
  let keys = (await getCacheApiKeys()).filter(d => hasAnyRole(d.userRoles, user.roles))
    .filter(d => d.chatModels.includes(chatModel))
  if (accountId)
    keys = keys.filter(d => d.keyModel === 'ChatGPTUnofficialProxyAPI' && getAccountId(d.key) === accountId)

  return randomKeyConfig(keys)
}

function getAccountId(accessToken: string): string {
  try {
    const jwt = jwt_decode(accessToken) as JWT
    return jwt['https://api.openai.com/auth'].user_id
  }
  catch (error) {
    return ''
  }
}

export type { ChatContext, ChatMessage }

export { chatReplyProcess, chatConfig, containsSensitiveWords }
