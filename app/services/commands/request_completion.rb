module Commands
  class RequestCompletion
    MODEL = "gpt-5.4-mini".freeze
    MAX_CORRECTION_ATTEMPTS = 1
    MAX_ROUNDS = 6

    class InvalidToolArgs < StandardError; end

    Result = Struct.new(:content, :tool_calls, keyword_init: true)

    def initialize(message)
      @message = message
    end

    def call
      prompt = Prompt.new(@message)
      @messages = prompt.messages
      @prompt_log = prompt.to_log
      build_result(run_agent_loop)
    end

    private

    def run_agent_loop
      MAX_ROUNDS.times do |round|
        response = call_openai
        context_calls = context_calls_in(response)
        return response if context_calls.empty? || round == MAX_ROUNDS - 1

        append_context_exchange(response, context_calls)
        @prompt_log += "\n\n[agent round #{round + 1}]"
      end
    end

    def append_context_exchange(response, context_calls)
      results = context_calls.map do |tc|
        { role: "tool", tool_call_id: tc.id,
          content: Tools.find(tc.function.name).execute(JSON.parse(tc.function.arguments)).to_json }
      end
      @messages += [ assistant_message(response, context_calls) ] + results
    end

    def assistant_message(response, tool_calls)
      {
        role: "assistant",
        content: response.choices.first.message.content,
        tool_calls: tool_calls.map { |tc| { id: tc.id, type: "function",
                                            function: { name: tc.function.name, arguments: tc.function.arguments } } }
      }
    end

    def context_calls_in(response)
      tool_calls_in(response).select { |tc| Tools.context?(tc.function.name) }
    end

    def action_calls_in(response)
      tool_calls_in(response).reject { |tc| Tools.context?(tc.function.name) }
    end

    def tool_calls_in(response)
      response.choices.first.message.tool_calls || []
    end

    def call_openai
      ai = AiRequest.create!(message: @message, prompt: @prompt_log, model: MODEL)
      response = client.chat.completions.create(
        model: MODEL, messages: @messages, tools: Tools.schemas
      )
      ai.update!(
        response: JSON.parse(response.to_json),
        prompt_tokens: response.usage&.prompt_tokens,
        completion_tokens: response.usage&.completion_tokens
      )
      response
    rescue StandardError => e
      ai&.update!(error: "#{e.class}: #{e.message}")
      raise
    end

    def build_result(response, attempt: 0)
      action_calls = action_calls_in(response)
      parsed = action_calls.map { |tc| { name: tc.function.name, args: JSON.parse(tc.function.arguments) } }

      errors = parsed.flat_map { |tc| Tools.validate(tc[:name], tc[:args]) }
      if errors.any?
        raise InvalidToolArgs, errors.join("; ") if attempt >= MAX_CORRECTION_ATTEMPTS

        append_correction(response, action_calls, errors)
        return build_result(call_openai, attempt: attempt + 1)
      end

      Result.new(content: response.choices.first.message.content, tool_calls: parsed)
    end

    def append_correction(response, action_calls, errors)
      corrections = action_calls.map do |tc|
        { role: "tool", tool_call_id: tc.id,
          content: "Invalid arguments: #{errors.join('; ')}. Correct and try again." }
      end
      @messages += [ assistant_message(response, action_calls) ] + corrections
      @prompt_log += "\n\n[correction retry]"
    end

    def client
      @client ||= OpenAI::Client.new(api_key: ENV.fetch("OPENAI_API_KEY", "test-key"))
    end
  end
end
