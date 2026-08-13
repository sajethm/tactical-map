require 'rails_helper'

RSpec.describe Commands::ProcessMessage do
  let(:user) { create(:user) }
  let(:conversation) { user.current_conversation }
  let(:message) { create(:message, conversation: conversation, status: 'pending', content: 'find Tanker-1') }

  it 'runs the full pipeline and completes the message' do
    entity = create(:entity, name: 'Tanker-1')
    stub_openai(tool_calls: [
      [ 'fly_to', { entity_id: entity.id } ],
      [ 'filter_entities', { kinds: [ 'ship' ] } ],
      [ 'open_details', { entity_id: entity.id } ]
    ], content: 'Found Tanker-1.')

    described_class.new(message).call

    reply = message.reload.reply
    expect(message.status).to eq('completed')
    expect(reply.actions.map { |a| a['type'] }).to eq(%w[fly_to filter_entities open_details])
    expect(reply.content).to eq('Found Tanker-1.')
  end

  it 'answers plain text with no actions when no tools are called' do
    stub_openai(tool_calls: [], content: 'There are 3 ships in view.')
    described_class.new(message).call
    reply = message.reload.reply
    expect(reply.actions).to eq([])
    expect(reply.content).to eq('There are 3 ships in view.')
    expect(message.status).to eq('completed')
  end

  it 'fails the message when RequestCompletion raises' do
    stub_request(:post, 'https://api.openai.com/v1/chat/completions')
      .to_return(status: 500, body: '{"error":{"message":"boom"}}',
                 headers: { 'Content-Type' => 'application/json' })
    described_class.new(message).call
    expect(message.reload.status).to eq('failed')
    expect(message.ai_requests.last.error).to be_present
  end
end
