require 'rails_helper'

RSpec.describe Commands::ApplyActions do
  let(:user) { create(:user) }
  let(:conversation) { user.current_conversation }
  let(:message) { create(:message, conversation: conversation, status: 'processing', content: 'find Tanker-1') }

  def result(content:, tool_calls:)
    Commands::RequestCompletion::Result.new(content: content, tool_calls: tool_calls)
  end

  it 'creates a reply message with actions in the given order and marks the source message completed' do
    entity = create(:entity, name: 'Tanker-1')
    r = result(content: 'Found Tanker-1.', tool_calls: [
      { name: 'fly_to', args: { 'entity_id' => entity.id } },
      { name: 'filter_entities', args: { 'kinds' => [ 'ship' ] } },
      { name: 'open_details', args: { 'entity_id' => entity.id } }
    ])

    described_class.new(message, r).call

    reply = message.reload.reply
    expect(message.status).to eq('completed')
    expect(reply.actions.map { |a| a['type'] }).to eq(%w[fly_to filter_entities open_details])
    expect(reply.content).to eq('Found Tanker-1.')
  end

  it 'writes an audit event per action' do
    entity = create(:entity)
    r = result(content: 'Done.', tool_calls: [
      { name: 'fly_to', args: { 'entity_id' => entity.id } },
      { name: 'open_details', args: { 'entity_id' => entity.id } }
    ])

    expect { described_class.new(message, r).call }.to change(AuditEvent, :count).by(2)
  end

  it 'marks needs_clarification when an ask_clarification action is present' do
    r = result(content: 'Which tanker do you mean?', tool_calls: [
      { name: 'ask_clarification', args: { 'question' => 'Which tanker?', 'choices' => %w[Tanker-1 Tanker-2] } }
    ])

    described_class.new(message, r).call

    expect(message.reload.status).to eq('needs_clarification')
    expect(message.reply.actions.first['choices']).to eq(%w[Tanker-1 Tanker-2])
  end

  it 'creates a marker entity server-side and injects its id into the action' do
    r = result(content: 'Done.', tool_calls: [
      { name: 'place_marker', args: { 'lat' => 44.5, 'lng' => -63.5, 'name' => 'Rally point' } }
    ])

    expect { described_class.new(message, r).call }.to change(Entity.where(kind: 'marker'), :count).by(1)
    marker = Entity.find_by(kind: 'marker', name: 'Rally point')
    expect(marker.created_by).to eq(user)
    expect(marker.properties['source_message_id']).to eq(message.id)
    expect(message.reload.reply.actions.first['entity_id']).to eq(marker.id)
  end

  it 'does not duplicate markers when applied twice for the same message' do
    r = result(content: 'Done.', tool_calls: [
      { name: 'place_marker', args: { 'lat' => 44.5, 'lng' => -63.5, 'name' => 'Rally point' } }
    ])

    described_class.new(message, r).call
    message.reload.reply&.destroy
    message.update!(status: 'processing')

    described_class.new(message, r).call

    expect(Entity.where(kind: 'marker', name: 'Rally point').count).to eq(1)
  end

  it 'falls back to "Done." when the model returns no reply text' do
    r = result(content: nil, tool_calls: [])
    described_class.new(message, r).call
    expect(message.reload.reply.content).to eq('Done.')
  end

  it 'answers plain text with no actions when there are no tool calls' do
    r = result(content: 'There are 3 ships in view.', tool_calls: [])
    described_class.new(message, r).call
    reply = message.reload.reply
    expect(reply.actions).to eq([])
    expect(reply.content).to eq('There are 3 ships in view.')
    expect(message.status).to eq('completed')
  end
end
