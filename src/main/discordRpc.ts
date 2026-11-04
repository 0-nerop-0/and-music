// ── Discord Rich Presence ────────────────────────────────────────────────────
// Показывает в статусе Discord текущий трек, время воспроизведения и то,
// что запущено приложение (&) Music. Требует Application ID из
// Discord Developer Portal (https://discord.com/developers/applications) —
// пользователь может задать свой в настройках, иначе используется дефолтный.

// discord-rpc не имеет типов из коробки — используем минимальный локальный тип
type DiscordRpcClient = {
  connect: (clientId: string) => Promise<void>
  login: (opts: { clientId: string }) => Promise<void>
  setActivity: (activity: Record<string, unknown>) => Promise<void>
  destroy: () => Promise<void>
  on: (event: string, cb: (...args: unknown[]) => void) => void
  clearActivity: () => Promise<void>
}

const DEFAULT_CLIENT_ID = '1536262771577069639' // Application ID из Discord Developer Portal

let client: DiscordRpcClient | null = null
let currentClientId: string | null = null
let connecting = false
let ready = false
let reconnectTimer: NodeJS.Timeout | null = null
let pendingActivity: Record<string, unknown> | null = null

async function loadRpcModule() {
  // Discord RPC зависит от нативных модулей — грузим лениво,
  // чтобы приложение не падало, если пакет не установлен.
  // The package does not ship TypeScript declarations; keep its boundary local.
  return (await import('discord-rpc')) as unknown as {
    Client: new (opts: { transport: 'ipc' }) => DiscordRpcClient
  }
}

async function disconnect(): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  ready = false
  pendingActivity = null
  if (client) {
    try {
      await client.destroy()
    } catch {
      /* ignore */
    }
    client = null
  }
  currentClientId = null
}

async function connect(clientId: string): Promise<void> {
  if (connecting) return
  if (client && currentClientId === clientId && ready) return

  await disconnect()
  connecting = true

  try {
    const { Client } = await loadRpcModule()
    const rpc = new Client({ transport: 'ipc' })

    rpc.on('ready', () => {
      ready = true
      currentClientId = clientId
      if (pendingActivity) {
        rpc.setActivity(pendingActivity).catch(() => {})
      }
    })

    rpc.on('disconnected', () => {
      ready = false
      scheduleReconnect(clientId)
    })

    // Важно: используем login(), а не connect() — событие 'ready' эмитится
    // только внутри login() (см. src/client.js пакета discord-rpc). При вызове
    // connect() напрямую 'ready' никогда не сработает и activity не отправится.
    await rpc.login({ clientId })
    client = rpc
  } catch (err) {
    console.error('Discord RPC connect failed:', err)
    client = null
    ready = false
    scheduleReconnect(clientId)
  } finally {
    connecting = false
  }
}

function scheduleReconnect(clientId: string): void {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    connect(clientId).catch(() => {})
  }, 15000)
}

export interface PresenceInfo {
  title: string
  artist: string
  isPlaying: boolean
  /** позиция в секундах */
  seek: number
  /** длительность в секундах */
  duration: number
}

export async function enableDiscordPresence(clientId?: string): Promise<void> {
  const id = clientId?.trim() || DEFAULT_CLIENT_ID
  if (!id) {
    throw new Error('Discord Client ID не задан. Укажите его в настройках приложения.')
  }
  await connect(id)
}

export async function disableDiscordPresence(): Promise<void> {
  await disconnect()
}

// Счётчик вызовов updatePresence. При быстрой смене трека (например, next/prev
// в плеере) может быть отправлено несколько setActivity почти одновременно —
// их ответы от Discord IPC не гарантированно приходят в том же порядке, в котором
// были отправлены запросы. Без этой защиты более старый (но позже завершившийся)
// вызов мог перезаписать корректный activity устаревшим — из-за этого казалось,
// что presence "не меняется" при смене трека прямо в плеере.
let presenceSeq = 0

export async function updatePresence(info: PresenceInfo | null): Promise<void> {
  const mySeq = ++presenceSeq

  if (!info) {
    pendingActivity = null
    if (client && ready) {
      try {
        await client.clearActivity()
      } catch {
        /* ignore */
      }
    }
    return
  }

  const now = Date.now()
  const startTimestamp = info.isPlaying ? Math.round(now - info.seek * 1000) : undefined
  const endTimestamp =
    info.isPlaying && info.duration > 0
      ? Math.round(now - info.seek * 1000 + info.duration * 1000)
      : undefined

  const activity: Record<string, unknown> = {
    details: info.title || 'Неизвестный трек',
    state: info.artist || 'Неизвестный исполнитель',
    largeImageKey: 'app_icon',
    largeImageText: '(&) Music',
    smallImageKey: info.isPlaying ? 'play' : 'pause',
    smallImageText: info.isPlaying ? 'Играет' : 'Пауза',
    instance: false,
  }

  if (startTimestamp) activity.startTimestamp = startTimestamp
  if (endTimestamp) activity.endTimestamp = endTimestamp

  // pendingActivity должен отражать самое актуальное состояние даже если этот
  // вызов устарел и его setActivity ниже будет отброшен — иначе при следующем
  // reconnect ('ready') отправится не последний трек, а тот, что случайно "победил" гонку.
  if (mySeq >= presenceSeq) pendingActivity = activity

  if (client && ready) {
    try {
      await client.setActivity(activity)
      // Пока мы ждали ответ Discord IPC, могла прийти более новая смена трека —
      // в этом случае просто молча игнорируем результат этого устаревшего вызова.
      if (mySeq !== presenceSeq) return
    } catch (err) {
      if (mySeq !== presenceSeq) return
      console.error('Discord setActivity failed:', err)
    }
  }
}

export function isDiscordConnected(): boolean {
  return ready
}
