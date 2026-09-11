export interface TelemetryStage {
  stt?: number;
  router_ms?: number;
  intentResolution?: number;
  permissionCheck?: number;
  entityResolution?: number;
  dom_read_ms?: number;
  db_ms?: number;
  tool_ms?: number;
  toolExecution?: number;
  navigation?: number;
  verification?: number;
  TTFT?: number;
  generation_ms?: number;
  response?: number;
  total_ms?: number;
  total?: number;
}

export interface LatencyTelemetryRecord {
  requestId: string;
  command: string;
  fastPathUsed: 'client' | 'server' | 'none' | 'groq_fast' | 'gemini_agent';
  provider: 'groq' | 'gemini' | 'grok' | 'none';
  model: string;
  request_start: number;
  TTFT?: number;
  generation_ms?: number;
  tool_ms?: number;
  dom_read_ms?: number;
  db_ms?: number;
  total_ms: number;
  success: boolean;
  fallback_reason?: string;
  llmCalls: number;
  apiCalls: number;
  domScans: number;
  cacheHit: boolean;
  stages: TelemetryStage;
  timestamp: number;
}

export class LatencyTracker {
  private startTime: number;
  private stageTimes: Record<string, number> = {};
  private llmCalls = 0;
  private apiCalls = 0;
  private domScans = 0;
  private cacheHit = false;
  private fastPathUsed: 'client' | 'server' | 'none' | 'groq_fast' | 'gemini_agent' = 'none';
  private provider: 'groq' | 'gemini' | 'grok' | 'none' = 'none';
  private model = 'unknown';
  private fallbackReason?: string;
  private isSuccess = true;
  private ttftTime?: number;

  constructor(
    private command: string, 
    private requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  ) {
    this.startTime = Date.now();
  }

  public markStage(stageName: keyof TelemetryStage) {
    this.stageTimes[stageName] = Date.now() - this.startTime;
  }

  public markTTFT() {
    this.ttftTime = Date.now() - this.startTime;
    this.stageTimes.TTFT = this.ttftTime;
  }

  public recordLlmCall() {
    this.llmCalls++;
  }

  public recordApiCall() {
    this.apiCalls++;
  }

  public recordDomScan() {
    this.domScans++;
  }

  public setProvider(provider: 'groq' | 'gemini' | 'grok' | 'none', model = 'unknown') {
    this.provider = provider;
    this.model = model;
  }

  public setCacheHit(hit: boolean) {
    this.cacheHit = hit;
  }

  public setFastPath(type: 'client' | 'server' | 'none' | 'groq_fast' | 'gemini_agent') {
    this.fastPathUsed = type;
  }

  public setFallbackReason(reason: string) {
    this.fallbackReason = reason;
  }

  public setSuccess(success: boolean) {
    this.isSuccess = success;
  }

  public finish(): LatencyTelemetryRecord {
    const total = Date.now() - this.startTime;
    this.stageTimes.total_ms = total;
    this.stageTimes.total = total;

    const record: LatencyTelemetryRecord = {
      requestId: this.requestId,
      command: this.command,
      fastPathUsed: this.fastPathUsed,
      provider: this.provider,
      model: this.model,
      request_start: this.startTime,
      TTFT: this.ttftTime,
      generation_ms: this.stageTimes.generation_ms || (this.ttftTime ? total - this.ttftTime : undefined),
      tool_ms: this.stageTimes.tool_ms || this.stageTimes.toolExecution,
      dom_read_ms: this.stageTimes.dom_read_ms,
      db_ms: this.stageTimes.db_ms,
      total_ms: total,
      success: this.isSuccess,
      fallback_reason: this.fallbackReason,
      llmCalls: this.llmCalls,
      apiCalls: this.apiCalls,
      domScans: this.domScans,
      cacheHit: this.cacheHit,
      stages: this.stageTimes,
      timestamp: Date.now()
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ [SmartAgent Telemetry] "${this.command}" | Provider: ${this.provider.toUpperCase()} (${this.model}) | Router/Path: ${this.fastPathUsed} | Total: ${total}ms | TTFT: ${this.ttftTime || 0}ms`, record.stages);
    }

    return record;
  }
}
