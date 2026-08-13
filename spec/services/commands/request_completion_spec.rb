require 'rails_helper'

RSpec.describe Commands::RequestCompletion do
  let(:user) { create(:user) }
  let(:conversation) { user.current_conversation }
  let(:message) { create(:message, conversation: conversation, status: 'pending', content: 'find Tanker-1') }

  it 'returns validated tool calls and reply content, logging an ai_request with tokens' do
    entity = create(:entity)
    stub_openai(tool_calls: [ [ 'fly_to', { entity_id: entity.id } ], [ 'open_details', { entity_id: entity.id } ] ],
                content: 'Found it.')

    result = described_class.new(message).call

    expect(result.content).to eq('Found it.')
    expect(result.tool_calls).to eq([
      { name: 'fly_to', args: { 'entity_id' => entity.id } },
      { name: 'open_details', args: { 'entity_id' => entity.id } }
    ])
    ai = message.ai_requests.last
    expect(ai.prompt_tokens).to eq(120)
    expect(ai.response).to be_present
  end

  it 'resolves an off-viewport entity via search_entities before returning tool_calls' do
    falcon = create(:entity, :aircraft, name: 'Falcon-1', lat: 51.15, lng: -71.67)
    stub_openai_rounds(
      { tool_calls: [ [ 'search_entities', { query: 'Falcon-1' } ] ] },
      { tool_calls: [ [ 'fly_to', { entity_id: falcon.id } ] ], content: 'Found Falcon-1.' }
    )

    result = described_class.new(message).call

    expect(result.tool_calls).to eq([ { name: 'fly_to', args: { 'entity_id' => falcon.id } } ])
    expect(message.ai_requests.count).to eq(2)
  end

  it 'never includes search_entities itself in the returned tool_calls' do
    entity = create(:entity, name: 'Tanker-1')
    stub_openai_rounds(
      { tool_calls: [ [ 'search_entities', { query: 'Tanker-1' } ] ] },
      { tool_calls: [ [ 'open_details', { entity_id: entity.id } ] ] }
    )

    result = described_class.new(message).call

    expect(result.tool_calls.map { |tc| tc[:name] }).to eq([ 'open_details' ])
  end

  it 'drops an action call bundled with a search call and uses the follow-up round instead' do
    entity = create(:entity, name: 'Tanker-1')
    stub_openai_rounds(
      { tool_calls: [ [ 'search_entities', { query: 'Tanker-1' } ], [ 'open_details', { entity_id: entity.id } ] ] },
      { tool_calls: [ [ 'open_details', { entity_id: entity.id } ] ] }
    )

    result = described_class.new(message).call

    expect(result.tool_calls.map { |tc| tc[:name] }).to eq([ 'open_details' ])
    expect(message.ai_requests.count).to eq(2)
  end

  it 'stops after MAX_ROUNDS and drops any still-pending context calls' do
    stub_openai_rounds(
      { tool_calls: [ [ 'search_entities', { query: 'Falcon' } ] ] },
      { tool_calls: [ [ 'search_entities', { query: 'Falcon' } ] ] },
      { tool_calls: [ [ 'search_entities', { query: 'Falcon' } ] ] },
      { tool_calls: [ [ 'search_entities', { query: 'Falcon' } ] ] }
    )

    result = described_class.new(message).call

    expect(result.tool_calls).to eq([])
    expect(message.ai_requests.count).to eq(described_class::MAX_ROUNDS)
  end

  it 'retries once with the validation errors when tool arguments are invalid' do
    entity = create(:entity)
    stub_openai_rounds(
      { tool_calls: [ [ 'fly_to', {} ] ] },
      { tool_calls: [ [ 'fly_to', { entity_id: entity.id } ] ], content: 'Corrected.' }
    )

    result = described_class.new(message).call

    expect(result.tool_calls).to eq([ { name: 'fly_to', args: { 'entity_id' => entity.id } } ])
    expect(message.ai_requests.count).to eq(2)
  end

  it 'raises InvalidToolArgs when arguments are still invalid after the correction retry' do
    stub_openai_rounds(
      { tool_calls: [ [ 'fly_to', {} ] ] },
      { tool_calls: [ [ 'fly_to', {} ] ] }
    )

    expect { described_class.new(message).call }
      .to raise_error(described_class::InvalidToolArgs, /fly_to needs/)
  end

  it 'records the error on the ai_request and re-raises when OpenAI errors' do
    stub_request(:post, 'https://api.openai.com/v1/chat/completions')
      .to_return(status: 500, body: '{"error":{"message":"boom"}}',
                 headers: { 'Content-Type' => 'application/json' })

    expect { described_class.new(message).call }.to raise_error(StandardError)
    expect(message.ai_requests.last.error).to be_present
  end
end
