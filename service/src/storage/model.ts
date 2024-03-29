import type { ObjectId } from 'mongodb'
import type { TextAuditServiceOptions, TextAuditServiceProvider } from 'src/utils/textAudit'

export enum Status {
  Normal = 0,
  Deleted = 1,
  InversionDeleted = 2,
  ResponseDeleted = 3,
  PreVerify = 4,
  AdminVerify = 5,
  Disabled = 6,
}

export enum UserRole {
  Admin = 0,
  User = 1,
  Guest = 2,
  Support = 3,
  Viewer = 4,
  Contributor = 5,
  Developer = 6,
  Tester = 7,
  Partner = 8,
}

export class UserInfo {
  _id: ObjectId
  name: string
  email: string
  password: string
  status: Status
  createTime: string
  verifyTime?: string
  avatar?: string
  description?: string
  updateTime?: string
  config?: UserConfig
  roles?: UserRole[]
  balance: number
  constructor(email: string, password: string) {
    this.name = email
    this.email = email
    this.password = password
    this.status = Status.PreVerify
    this.createTime = new Date().toLocaleString()
    this.verifyTime = null
    this.updateTime = new Date().toLocaleString()
    this.roles = [UserRole.User]
    this.balance = 10
  }
}

export class UserConfig {
  chatModel: CHATMODEL
}

// https://platform.openai.com/docs/models/overview
export type CHATMODEL = 'gpt-3.5-turbo' | 'gpt-3.5-turbo-0301' | 'gpt-4' | 'gpt-4-0314' | 'gpt-4-32k' | 'gpt-4-32k-0314' | 'ext-davinci-002-render-sha-mobile' | 'gpt-4-mobile' | 'gpt-4-browsing' | 'mid-journey' | 'gpt-3.5-turbo-0613' | 'gpt-3.5-turbo-16k' | 'auto-gpt' | 'plugin' | 'gpt-4-turbo-preview' | 'gpt-4-vision-preview' | 'gpt-3.5-turbo-0125'

export const CHATMODELS: CHATMODEL[] = [
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-0301',
  'gpt-4',
  'gpt-4-0314',
  'gpt-4-32k',
  'gpt-4-32k-0314',
  'ext-davinci-002-render-sha-mobile',
  'gpt-4-mobile',
  'gpt-4-browsing',
  'mid-journey',
  'gpt-3.5-turbo-0613',
  'gpt-3.5-turbo-16k',
  'auto-gpt',
  'plugin',
  'gpt-4-turbo-preview',
  'gpt-4-vision-preview',
  'gpt-3.5-turbo-0125',
]

export const chatModelOptions = [
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-0301',
  'gpt-4',
  'gpt-4-0314',
  'gpt-4-32k',
  'gpt-4-32k-0314',
  'text-davinci-002-render-sha-mobile',
  'gpt-4-mobile',
  'gpt-4-browsing',
  'mid-journey',
  'gpt-3.5-turbo-0613',
  'gpt-3.5-turbo-16k',
  'auto-gpt',
  'plugin',
  'gpt-4-turbo-preview',
  'gpt-4-vision-preview',
  'gpt-3.5-turbo-0125',
].map((model: string) => {
  let label = model
  if (model === 'text-davinci-002-render-sha-mobile')
    label = 'gpt-3.5-mobile'
  return {
    label,
    key: model,
    value: model,
  }
})

export class ChatRoom {
  _id: ObjectId
  roomId: number
  userId: string
  title: string
  prompt: string
  usingContext: boolean
  status: Status = Status.Normal
  // only access token used
  accountId?: string
  constructor(userId: string, title: string, roomId: number) {
    this.userId = userId
    this.title = title
    this.prompt = undefined
    this.roomId = roomId
    this.usingContext = true
    this.accountId = null
  }
}

export class ChatOptions {
  parentMessageId?: string
  messageId?: string
  conversationId?: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  estimated?: boolean
  constructor(parentMessageId?: string, messageId?: string, conversationId?: string) {
    this.parentMessageId = parentMessageId
    this.messageId = messageId
    this.conversationId = conversationId
  }
}

export class previousResponse {
  response: string
  options: ChatOptions
}

export class ChatInfo {
  _id: ObjectId
  userId: string
  roomId: number
  uuid: number
  dateTime: number
  prompt: string
  response?: string
  status: Status = Status.Normal
  options: ChatOptions
  imageBase64?: string
  imgOperation?: string
  taskId?: string
  imgResultStatus?: string
  previousResponse?: previousResponse[]
  constructor(userId: string, roomId: number, uuid: number, prompt: string, options: ChatOptions, imageBase64?: string, imgOperation?: string, taskId?: string) {
    this.userId = userId
    this.roomId = roomId
    this.uuid = uuid
    this.prompt = prompt
    this.options = options
    this.dateTime = new Date().getTime()
    this.imageBase64 = imageBase64
    this.imgOperation = imgOperation
    this.taskId = taskId || null
  }
}

export class UserTaskImg {
  userId: string
  dateTime: number
  prompt: string
  taskId?: string
  constructor(userId: string, prompt: string, taskId: string) {
    this.userId = userId
    this.prompt = prompt
    this.dateTime = new Date().getTime()
    this.taskId = taskId
  }
}

export class FunctionConfig {
  userId: string
  functionName: string
  functionSwitch: boolean
  constructor(userId: string, functionName: string, functionSwitch: boolean) {
    this.functionName = functionName
    this.functionSwitch = functionSwitch
    this.userId = userId
  }
}

export class UsageResponse {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  estimated: boolean
}

export class ChatUsage {
  _id: ObjectId
  userId: ObjectId
  roomId: number
  chatId: ObjectId
  messageId: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimated: boolean
  dateTime: number
  constructor(userId: ObjectId, roomId: number, chatId: ObjectId, messageId: string, usage: UsageResponse) {
    this.userId = userId
    this.roomId = roomId
    this.chatId = chatId
    this.messageId = messageId
    if (usage) {
      this.promptTokens = usage.prompt_tokens
      this.completionTokens = usage.completion_tokens
      this.totalTokens = usage.total_tokens
      this.estimated = usage.estimated
    }
    this.dateTime = new Date().getTime()
  }
}

export class Config {
  role: any
  constructor(
    public _id: ObjectId,
    public timeoutMs: number,
    public apiKey?: string,
    public apiDisableDebug?: boolean,
    public accessToken?: string,
    public apiBaseUrl?: string,
    public apiModel?: APIMODEL,
    public reverseProxy?: string,
    public socksProxy?: string,
    public socksAuth?: string,
    public httpsProxy?: string,
    public siteConfig?: SiteConfig,
    public mailConfig?: MailConfig,
    public auditConfig?: AuditConfig,
    public mjCdnProxy?: string,
    public mjApiProxy?: string,
    public maxModelTokens?: number,
    public maxResponseTokens?: number,
    public autoGptUrl?: string,
    public autoGptToken?: string,
  ) { }
}

export class SiteConfig {
  constructor(
    public siteTitle?: string,
    public loginEnabled?: boolean,
    public loginSalt?: string,
    public registerEnabled?: boolean,
    public registerReview?: boolean,
    public registerMails?: string,
    public siteDomain?: string,
  ) { }
}

export class MailConfig {
  constructor(
    public smtpHost: string,
    public smtpPort: number,
    public smtpTsl: boolean,
    public smtpUserName: string,
    public smtpPassword: string,
  ) { }
}

export class AuditConfig {
  constructor(
    public enabled: boolean,
    public provider: TextAuditServiceProvider,
    public options: TextAuditServiceOptions,
    public textType: TextAudioType,
    public customizeEnabled: boolean,
    public sensitiveWords: string,
  ) { }
}

export enum TextAudioType {
  None = 0,
  Request = 1 << 0, // 二进制 01
  Response = 1 << 1, // 二进制 10
  All = Request | Response, // 二进制 11
}

export class KeyConfig {
  _id: ObjectId
  key: string
  keyModel: APIMODEL
  chatModels: CHATMODEL[]
  userRoles: UserRole[]
  status: Status
  remark: string
  constructor(key: string, keyModel: APIMODEL, chatModels: CHATMODEL[], userRoles: UserRole[], remark: string) {
    this.key = key
    this.keyModel = keyModel
    this.chatModels = chatModels
    this.userRoles = userRoles
    this.status = Status.Normal
    this.remark = remark
  }
}

export type APIMODEL = 'ChatGPTAPI' | 'ChatGPTUnofficialProxyAPI'
