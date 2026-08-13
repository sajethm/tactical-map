require 'rails_helper'

RSpec.describe Commands::Prompt do
  let(:conversation) { create(:conversation) }
  let(:message) do
    create(:message, conversation: conversation, content: 'show me ships here',
                     context: { 'bounds' => [ -64.0, 44.0, -63.0, 45.0 ], 'selected_entity_id' => nil })
  end

  describe '#messages' do
    it 'starts with a system message and ends with the user command' do
      msgs = described_class.new(message).messages
      expect(msgs.first[:role]).to eq('system')
      expect(msgs.last[:role]).to eq('user')
      expect(msgs.last[:content]).to include('show me ships here')
    end

    it 'includes visible entities inside the viewport and excludes those outside' do
      inside = create(:entity, name: 'Tanker-99', lat: 44.5, lng: -63.5)
      create(:entity, name: 'Faraway-1', lat: 50.0, lng: -70.0)
      content = described_class.new(message).messages.last[:content]
      expect(content).to include('Tanker-99')
      expect(content).not_to include('Faraway-1')
      expect(content).to include(inside.id.to_s)
    end

    it 'includes prior conversation messages, most recent 10 only' do
      12.times { |i| create(:message, conversation: conversation, content: "old-#{i}") }
      msgs = described_class.new(message).messages
      chat_history = msgs[1..-2]
      expect(chat_history.size).to eq(10)
      expect(chat_history.last[:content]).to eq('old-11')
      expect(msgs.map { |m| m[:content] }).not_to include('old-0')
    end

    it 'notes the selected entity when present' do
      entity = create(:entity, name: 'Frigate-7')
      message.update!(context: message.context.merge('selected_entity_id' => entity.id))
      content = described_class.new(message).messages.last[:content]
      expect(content).to include('Frigate-7')
      expect(content).to include('selected')
    end
  end

  describe 'system prompt' do
    it 'tells the model to search before asking for clarification on an unseen entity' do
      system_content = described_class.new(message).messages.first[:content]
      expect(system_content).to include('search_entities')
    end

    it 'tells the model to pair fly_to with open_details for single-entity lookups' do
      system_content = described_class.new(message).messages.first[:content]
      expect(system_content).to include('open_details')
    end
  end

  describe '#to_log' do
    it 'serializes the whole prompt to one string' do
      log = described_class.new(message).to_log
      expect(log).to include('system:')
      expect(log).to include('show me ships here')
    end
  end
end
