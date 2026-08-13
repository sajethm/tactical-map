module OpenAiStubs
  def stub_openai(tool_calls: [], content: 'Done.', status: 200)
    body = {
      choices: [ { message: { role: 'assistant', content: content,
                              tool_calls: tool_calls.map.with_index do |(name, args), i|
                                { id: "call_#{i}", type: 'function',
                                  function: { name: name, arguments: args.to_json } }
                              end } } ],
      usage: { prompt_tokens: 120, completion_tokens: 25 }
    }
    stub_request(:post, 'https://api.openai.com/v1/chat/completions')
      .to_return(status: status, body: body.to_json, headers: { 'Content-Type' => 'application/json' })
  end

  def stub_openai_rounds(*rounds)
    bodies = rounds.map do |round|
      {
        choices: [ { message: { role: 'assistant', content: round[:content] || 'Done.',
                                 tool_calls: (round[:tool_calls] || []).map.with_index do |(name, args), i|
                                   { id: "call_#{rounds.index(round)}_#{i}", type: 'function',
                                     function: { name: name, arguments: args.to_json } }
                                 end } } ],
        usage: { prompt_tokens: 120, completion_tokens: 25 }
      }.to_json
    end
    stub_request(:post, 'https://api.openai.com/v1/chat/completions')
      .to_return(bodies.map { |b| { status: 200, body: b, headers: { 'Content-Type' => 'application/json' } } })
  end
end

RSpec.configure do |config|
  config.include OpenAiStubs
end
