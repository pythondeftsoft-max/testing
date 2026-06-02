import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskIds } = await req.json();
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'taskIds array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the tasks
    const { data: tasks, error: fetchError } = await supabase
      .from('implementation_tasks')
      .select('id, title, description, category')
      .in('id', taskIds);

    if (fetchError) {
      console.error('Error fetching tasks:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tasks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating subtasks for ${tasks.length} tasks`);

    // Process each task
    const results = [];
    for (const task of tasks) {
      try {
        // Call AI to generate subtasks
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant that breaks down tasks into actionable subtasks. Generate 3-5 specific, actionable subtasks for the given task. Each subtask should be clear and concise.'
              },
              {
                role: 'user',
                content: `Break down this task into 3-5 actionable subtasks:\n\nTitle: ${task.title}\nDescription: ${task.description || 'No description provided'}\nCategory: ${task.category}`
              }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'generate_subtasks',
                description: 'Generate a list of actionable subtasks',
                parameters: {
                  type: 'object',
                  properties: {
                    subtasks: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string', description: 'Clear, actionable subtask title' }
                        },
                        required: ['title']
                      },
                      minItems: 3,
                      maxItems: 5
                    }
                  },
                  required: ['subtasks']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'generate_subtasks' } }
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error(`AI API error for task ${task.id}:`, aiResponse.status, errorText);
          results.push({ taskId: task.id, success: false, error: 'AI generation failed' });
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
        
        if (!toolCall) {
          console.error(`No tool call in response for task ${task.id}`);
          results.push({ taskId: task.id, success: false, error: 'Invalid AI response' });
          continue;
        }

        const generatedSubtasks = JSON.parse(toolCall.function.arguments).subtasks;
        
        // Format subtasks with proper structure
        const subtasks = generatedSubtasks.map((st: any, index: number) => ({
          id: crypto.randomUUID(),
          title: st.title,
          completed: false,
          order: index + 1
        }));

        // Update the task with generated subtasks
        const { error: updateError } = await supabase
          .from('implementation_tasks')
          .update({ subtasks: subtasks })
          .eq('id', task.id);

        if (updateError) {
          console.error(`Error updating task ${task.id}:`, updateError);
          results.push({ taskId: task.id, success: false, error: 'Failed to update task' });
        } else {
          console.log(`Successfully generated ${subtasks.length} subtasks for task ${task.id}`);
          results.push({ taskId: task.id, success: true, subtaskCount: subtasks.length });
        }
      } catch (error) {
        console.error(`Error processing task ${task.id}:`, error);
        results.push({ taskId: task.id, success: false, error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${tasks.length} tasks processed successfully`);

    return new Response(
      JSON.stringify({ results, successCount, totalCount: tasks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-subtasks function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});