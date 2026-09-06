export interface TelemetryStage {
  stt?: number;
  intentResolution?: number;
  permissionCheck?: number;
  entityResolution?: number;
  toolExecution?: number;
  navigation?: number;
  verification?: number;
  response?: number;
  total?: number;
}

export interface LatencyTelemetryRecord {
  requestId: string;
  command: string;
  fastPathUsed: 'client' | 'server' | 'none';
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
  private fastPathUsed: 'client' | 'server' | 'none' = 'none';

  constructor(
    private command: string, 
    private requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  ) {
    this.startTime = Date.now();
  }

  public markStage(stageName: keyof TelemetryStage) {
    this.stageTimes[stageName] = Date.now() - this.startTime;
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

  public setCacheHit(hit: boolean) {
    this.cacheHit = hit;
  }

  public setFastPath(type: 'client' | 'server' | 'none') {
    this.fastPathUsed = type;
  }

  public finish(): LatencyTelemetryRecord {
    const total = Date.now() - this.startTime;
    this.stageTimes.total = total;

    const record: LatencyTelemetryRecord = {
      requestId: this.requestId,
      command: this.command,
      fastPathUsed: this.fastPathUsed,
      llmCalls: this.llmCalls,
      apiCalls: this.apiCalls,
      domScans: this.domScans,
      cacheHit: this.cacheHit,
      stages: this.stageTimes,
      timestamp: Date.now()
    };

    console.log(`⚡ [SmartAgent Telemetry] "${this.command}" | ${total}ms | FastPath: ${this.fastPathUsed.toUpperCase()} | LLM: ${this.llmCalls} | API: ${this.apiCalls} | DOM Scans: ${this.domScans} | CacheHit: ${this.cacheHit}`, record.stages);

    return record;
  }
}
