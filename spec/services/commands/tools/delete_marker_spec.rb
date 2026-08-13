require 'rails_helper'

RSpec.describe Commands::Tools::DeleteMarker do
  let(:user) { create(:user) }
  let(:message) { create(:message, conversation: user.current_conversation) }
  let(:context) { { user: user, message: message } }

  describe '.validate' do
    it 'requires an integer entity_id' do
      expect(described_class.validate({ 'entity_id' => 5 })).to be_empty
      expect(described_class.validate({})).not_to be_empty
      expect(described_class.validate({ 'entity_id' => 'five' })).not_to be_empty
    end
  end

  describe '.execute' do
    it 'deletes a marker and reports its name' do
      marker = create(:entity, :marker, name: 'Rally point')

      result = described_class.execute({ 'entity_id' => marker.id }, context: context)

      expect(Entity.find_by(id: marker.id)).to be_nil
      expect(result).to include('deleted' => true, 'name' => 'Rally point', 'entity_id' => marker.id)
    end

    it 'refuses to delete anything that is not a marker' do
      ship = create(:entity, name: 'Tanker-9')

      result = described_class.execute({ 'entity_id' => ship.id }, context: context)

      expect(ship.reload).to be_present
      expect(result).to include('deleted' => false, 'reason' => 'not_a_marker', 'name' => 'Tanker-9')
    end

    it 'reports a missing entity instead of raising' do
      result = described_class.execute({ 'entity_id' => 999_999 }, context: context)
      expect(result).to include('deleted' => false, 'reason' => 'not_found')
    end
  end
end
