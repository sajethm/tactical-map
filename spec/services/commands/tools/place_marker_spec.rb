require 'rails_helper'

RSpec.describe Commands::Tools::PlaceMarker do
  let(:user) { create(:user) }
  let(:message) { create(:message, conversation: user.current_conversation) }

  describe '.execute' do
    it 'creates a marker entity and returns the args merged with its id' do
      result = described_class.execute(
        { 'lat' => 44.5, 'lng' => -63.5, 'name' => 'Rally point' },
        context: { user: user, message: message }
      )

      marker = Entity.find_by(kind: 'marker', name: 'Rally point')
      expect(marker).to be_present
      expect(marker.created_by).to eq(user)
      expect(marker.properties['source_message_id']).to eq(message.id)
      expect(result['entity_id']).to eq(marker.id)
    end

    it 'is idempotent for the same message and marker name' do
      args = { 'lat' => 44.5, 'lng' => -63.5, 'name' => 'Rally point' }
      context = { user: user, message: message }

      described_class.execute(args, context: context)
      expect { described_class.execute(args, context: context) }
        .not_to change(Entity.where(kind: 'marker', name: 'Rally point'), :count)
    end
  end
end
