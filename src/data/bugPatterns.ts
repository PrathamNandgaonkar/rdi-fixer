export interface BugPattern {
  id: string;
  buggyCode: string;
  correctedCode: string;
  explanation: string;
  bugType: "Logic" | "Hardware Constraints" | "Syntax" | "Lifecycle" | "Parameter Order";
  apiContext: string;
  trustScore: number;
}

export const sampleBugs: BugPattern[] = [
  {
    id: "BUG-001",
    buggyCode: `// Incorrect iClamp parameter order
RDI_BEGIN();
AVI64.setVoltage(pinA, 35.0);  // Exceeds 30V max
iClamp(pinB, 0.5, 0.1, HIGH);  // Wrong param order
measure(pinA);
RDI_END();`,
    correctedCode: `// Fixed iClamp parameter order & voltage
RDI_BEGIN();
AVI64.setVoltage(pinA, 28.0);  // Within 30V limit
iClamp(pinB, HIGH, 0.5, 0.1);  // Correct: pin, mode, high, low
measure(pinA);
RDI_END();`,
    explanation: "Two bugs found:\n1. **Voltage Range Violation**: AVI64 pins have a maximum voltage of 30V. The original code sets 35V, which can damage hardware.\n2. **iClamp Parameter Order**: The iClamp function expects (pin, mode, highLimit, lowLimit), but parameters were shuffled — mode was placed third instead of second.",
    bugType: "Parameter Order",
    apiContext: "**AVI64.setVoltage(pin, voltage)**\n- Range: -2V to +30V\n- Exceeding range triggers HW protection fault\n\n**iClamp(pin, mode, highLimit, lowLimit)**\n- mode: HIGH | LOW | BOTH\n- Limits in Amps (0.001 to 1.0)",
    trustScore: 94,
  },
  {
    id: "BUG-002",
    buggyCode: `// Lifecycle error
measure(pinA);
RDI_BEGIN();
AVI64.connect(portX, pinA);
smartVec().burstUpload(data);
RDI_END();`,
    correctedCode: `// Fixed lifecycle order
RDI_BEGIN();
AVI64.connect(portX, pinA);
smartVec().burstUpload(data);
measure(pinA);
RDI_END();`,
    explanation: "**Improper Lifecycle**: `measure()` was called before `RDI_BEGIN()`, meaning the measurement subsystem is uninitialized. All RDI operations must occur between `RDI_BEGIN()` and `RDI_END()` markers. The measurement was moved inside the lifecycle block.",
    bugType: "Lifecycle",
    apiContext: "**RDI Lifecycle Protocol**\n- `RDI_BEGIN()` initializes hardware context\n- All pin operations must be within BEGIN/END\n- `RDI_END()` releases resources & flushes buffers\n- Calling ops outside lifecycle = undefined behavior",
    trustScore: 98,
  },
  {
    id: "BUG-003",
    buggyCode: `// Port/pin mismatch
RDI_BEGIN();
DVI16.connect(portAnalog, pinDigital_3);
DVI16.setVoltage(portAnalog, 5.0);
measure(pinDigital_3);
RDI_END();`,
    correctedCode: `// Fixed port/pin configuration
RDI_BEGIN();
DVI16.connect(portAnalog, pinAnalog_3);
DVI16.setVoltage(portAnalog, 5.0);
measure(pinAnalog_3);
RDI_END();`,
    explanation: "**Port Name & Pin Config Mismatch**: `portAnalog` was connected to `pinDigital_3`, which is a digital-type pin. Analog ports must be paired with analog-capable pins. This mismatch causes silent measurement errors and incorrect test results.",
    bugType: "Logic",
    apiContext: "**DVI16.connect(port, pin)**\n- Port type must match pin capability\n- Analog ports → analog pins only\n- Digital ports → digital pins only\n- Mismatch does NOT throw error — fails silently",
    trustScore: 91,
  },
  {
    id: "BUG-004",
    buggyCode: `// Measurement binding order
RDI_BEGIN();
AVI64.connect(portX, pinA);
result = measure(pinA);
smartVec().burstUpload(testPattern);
applyResult(result);
RDI_END();`,
    correctedCode: `// Fixed measurement binding order
RDI_BEGIN();
AVI64.connect(portX, pinA);
smartVec().burstUpload(testPattern);
result = measure(pinA);
applyResult(result);
RDI_END();`,
    explanation: "**Measurement Binding Order Bug**: `measure()` was called before `smartVec().burstUpload()`. The burst pattern must be uploaded and applied to pins before taking measurements, otherwise the measurement captures an idle/default state instead of the test stimulus response.",
    bugType: "Logic",
    apiContext: "**smartVec().burstUpload(pattern)**\n- Must be called BEFORE measure()\n- Uploads vector pattern to sequencer\n- Pattern executes on next clock cycle\n\n**measure(pin)** captures pin state AFTER pattern completes",
    trustScore: 87,
  },
  {
    id: "BUG-005",
    buggyCode: `// Missing RDI_END
RDI_BEGIN();
AVI64.connect(portX, pinA);
AVI64.setVoltage(portX, 12.0);
iClamp(pinA, HIGH, 0.5, 0.1);
measure(pinA);
// forgot RDI_END`,
    correctedCode: `// Added missing RDI_END
RDI_BEGIN();
AVI64.connect(portX, pinA);
AVI64.setVoltage(portX, 12.0);
iClamp(pinA, HIGH, 0.5, 0.1);
measure(pinA);
RDI_END();`,
    explanation: "**Missing Lifecycle Terminator**: `RDI_END()` was never called. This leaves hardware resources locked, prevents other test sequences from executing, and can cause resource exhaustion on the tester. Every `RDI_BEGIN()` must have a matching `RDI_END()`.",
    bugType: "Lifecycle",
    apiContext: "**RDI_END()**\n- Releases all pin connections\n- Flushes measurement buffers\n- Resets clamp settings\n- MUST be called even if errors occur\n- Consider using try/finally pattern",
    trustScore: 96,
  },
];
