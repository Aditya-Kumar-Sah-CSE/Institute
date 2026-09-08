# 36. End-to-End System Data Flow Maps

STATUS: ✅ IMPLEMENTED

## 1. BYOK AI Response Flow
```text
User UI Prompt -> SmartAgentDrawer -> runSmartAgent() -> getUserAIProvider() -> AES Decrypt -> Gemini/Grok API -> Tool Evaluation -> UI Execution
```

## 2. In-Browser SQL Flow
```text
User Query -> Monaco SQL -> tokenizer.ts -> parser.ts (AST) -> executor.ts -> In-Memory Execution -> Result Table Render
```
