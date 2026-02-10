import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert RDI (Remote Device Interface) code analyzer for semiconductor test systems. You analyze buggy RDI code and produce corrected versions.

You will receive CSV rows where each row has an "ID" and "BuggyCode" column. For each row, analyze the buggy RDI code and produce:
1. CorrectedCode - the fixed version
2. Explanation - why it failed (Logic, Hardware Constraints, Syntax, Lifecycle, Parameter Order)
3. BugType - one of: Logic, Hardware Constraints, Syntax, Lifecycle, Parameter Order
4. APIContext - relevant RDI API documentation for the fix
5. TrustScore - 0-100 confidence score

Common RDI bugs to look for:
- Incorrect iClamp parameter order: should be (pin, mode, highLimit, lowLimit)
- Improper lifecycle: operations outside RDI_BEGIN/RDI_END blocks
- Voltage range violations: AVI64 pins max 30V, DVI16 pins max 20V
- Port/pin type mismatches: analog ports must pair with analog pins
- Measurement binding order: smartVec().burstUpload() must be called before measure()
- Missing RDI_END causing resource leaks

You MUST respond using the suggest_fixes tool with the analysis results.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvContent } = await req.json();
    if (!csvContent) {
      return new Response(JSON.stringify({ error: "csvContent is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Analyze the following CSV of buggy RDI code and return fixes for each row:\n\n${csvContent}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_fixes",
                description:
                  "Return analysis results for each buggy RDI code row.",
                parameters: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          buggyCode: { type: "string" },
                          correctedCode: { type: "string" },
                          explanation: { type: "string" },
                          bugType: {
                            type: "string",
                            enum: [
                              "Logic",
                              "Hardware Constraints",
                              "Syntax",
                              "Lifecycle",
                              "Parameter Order",
                            ],
                          },
                          apiContext: { type: "string" },
                          trustScore: { type: "number" },
                        },
                        required: [
                          "id",
                          "buggyCode",
                          "correctedCode",
                          "explanation",
                          "bugType",
                          "apiContext",
                          "trustScore",
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["results"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_fixes" },
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-rdi error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
