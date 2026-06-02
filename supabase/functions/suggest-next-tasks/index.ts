import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface Task {
  id?: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status?: string | null;
  estimated_time?: string | null;
  dependencies?: string[];
  completedSubtasks?: number;
  totalSubtasks?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { existingTasks, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const tasks = existingTasks as Task[];
    const completedCount = tasks.filter(t => t.status === 'Done').length;
    const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
    const backlogCount = tasks.filter(t => t.status === 'Backlog').length;
    const categories = [...new Set(tasks.map(t => t.category))];
    
    // Calculate priority distribution
    const highPriorityCount = tasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
    const mediumPriorityCount = tasks.filter(t => t.priority === 'Medium').length;
    const lowPriorityCount = tasks.filter(t => t.priority === 'Low').length;

    let systemPrompt: string;
    let body: any;

    if (type === 'suggest') {
      systemPrompt = `You are a technical product manager analyzing a development roadmap.

Current state:
- Total tasks: ${tasks.length}
- Completed: ${completedCount}
- In Progress: ${inProgressCount}
- Backlog: ${backlogCount}
- Categories: ${categories.join(', ')}
- Priority distribution: ${highPriorityCount} high, ${mediumPriorityCount} medium, ${lowPriorityCount} low

Recent completed tasks: ${tasks.filter(t => t.status === 'Done').slice(-5).map(t => t.title).join(', ') || 'None'}

Suggest 3-5 new actionable tasks that would:
1. Fill gaps in the current roadmap
2. Build on completed work
3. Provide high user value
4. Address important features or improvements

PRIORITY SCORING CRITERIA:
- HIGH: Critical blockers, high-value features, foundational work that enables multiple other tasks
- MEDIUM: Important improvements, standard features, work that adds value but isn't blocking
- LOW: Nice-to-haves, minor enhancements, polish work

IMPORTANT: Return tasks in RECOMMENDED EXECUTION ORDER (most important/urgent first).
For each task provide clear reasoning about WHY it should be done next and in this order.`;

      body = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "What tasks should we work on next? Suggest 3-5 new tasks." }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_tasks",
              description: "Return 3-5 actionable task suggestions.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Clear, actionable task title" },
                        reasoning: { type: "string", description: "Why this task now? What's the value?" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        category: { type: "string", description: "Task category" },
                        estimated_time: { type: "string", description: "Estimated time like '2h' or '1d'" }
                      },
                      required: ["title", "reasoning", "priority", "category"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_tasks" } }
      };
    } else {
      // prioritize mode
      systemPrompt = `You are a technical lead. Review these ${backlogCount} backlog tasks and recommend which 3 to tackle next.

Priority distribution: ${highPriorityCount} high, ${mediumPriorityCount} medium, ${lowPriorityCount} low

PRIORITIZATION FRAMEWORK:
1. Dependencies: Identify tasks that unblock other work (highest impact)
2. User Value: Features that directly improve user experience or solve pain points
3. Technical Foundation: Infrastructure/architecture that enables multiple features
4. Quick Wins: High value + low effort tasks that build momentum
5. Risk Reduction: Address technical debt or stability issues before they worsen

Current backlog tasks:
${tasks.filter(t => t.status === 'Backlog').map(t => 
  `- ${t.title} (${t.category}, ${t.priority} priority${t.dependencies?.length ? ', has ' + t.dependencies.length + ' dependencies' : ''}${t.estimated_time ? ', ~' + t.estimated_time : ''})`
).join('\n')}

CRITICAL: Return the TOP 3 tasks in RECOMMENDED EXECUTION ORDER (1st → 2nd → 3rd).
Consider which tasks should be done before others, not just which are "most important".
Explain the execution order reasoning for each task.`;

      body = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Which 3 tasks from the backlog should we prioritize?" }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "prioritize_tasks",
              description: "Return top 3 prioritized tasks from backlog.",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Task ID from the backlog" },
                        title: { type: "string" },
                        reasoning: { type: "string", description: "Why prioritize this now?" },
                        priority: { type: "string", enum: ["low", "medium", "high"] },
                        category: { type: "string" },
                        isReady: { type: "boolean", description: "Are dependencies resolved?" }
                      },
                      required: ["id", "title", "reasoning", "priority", "category", "isReady"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "prioritize_tasks" } }
      };
    }

    console.log('Calling Lovable AI Gateway...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const suggestions = JSON.parse(toolCall.function.arguments).suggestions;

    // Mark suggestions as existing or new
    const enrichedSuggestions = suggestions.map((s: any) => ({
      ...s,
      isExisting: type === 'prioritize',
      isReady: s.isReady ?? true,
    }));

    return new Response(
      JSON.stringify({ suggestions: enrichedSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-next-tasks:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
