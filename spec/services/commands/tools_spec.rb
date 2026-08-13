require 'rails_helper'

RSpec.describe Commands::Tools do
  describe '.schemas' do
    it 'defines all ten tools' do
      names = described_class.schemas.map { |s| s[:function][:name] }
      expect(names).to contain_exactly(
        'fly_to', 'filter_entities', 'place_marker', 'show_history',
        'open_details', 'clear_filters', 'ask_clarification', 'search_entities',
        'set_weather_overlay', 'delete_marker'
      )
    end
  end

  describe '.validate' do
    it 'accepts fly_to with lat/lng' do
      expect(described_class.validate('fly_to', { 'lat' => 44.6, 'lng' => -63.5 })).to be_empty
    end

    it 'accepts fly_to with entity_id alone' do
      expect(described_class.validate('fly_to', { 'entity_id' => 3 })).to be_empty
    end

    it 'rejects fly_to with no target' do
      errors = described_class.validate('fly_to', {})
      expect(errors).to include(a_string_matching(/lat\/lng, entity_id, or bounds/))
    end

    it 'rejects filter_entities with unknown kind' do
      errors = described_class.validate('filter_entities', { 'kinds' => [ 'submarine' ] })
      expect(errors).to include(a_string_matching(/submarine/))
    end

    it 'requires place_marker lat, lng, name' do
      expect(described_class.validate('place_marker', { 'lat' => 1.0 }))
        .to include(a_string_matching(/lng/), a_string_matching(/name/))
    end

    it 'requires entity_id for show_history and open_details' do
      expect(described_class.validate('show_history', {})).not_to be_empty
      expect(described_class.validate('open_details', { 'entity_id' => 5 })).to be_empty
    end

    it 'requires an integer entity_id for delete_marker' do
      expect(described_class.validate('delete_marker', { 'entity_id' => 5 })).to be_empty
      expect(described_class.validate('delete_marker', {})).not_to be_empty
    end

    it 'requires a question for ask_clarification' do
      expect(described_class.validate('ask_clarification', {})).not_to be_empty
      expect(described_class.validate('ask_clarification', { 'question' => 'Which ship?' })).to be_empty
    end

    it 'requires search_entities to have a query' do
      expect(described_class.validate('search_entities', {})).not_to be_empty
      expect(described_class.validate('search_entities', { 'query' => 'Falcon' })).to be_empty
    end

    it 'accepts set_weather_overlay with a known layer' do
      expect(described_class.validate('set_weather_overlay', { 'layer' => 'temperature' })).to be_empty
      expect(described_class.validate('set_weather_overlay', { 'layer' => 'none' })).to be_empty
    end

    it 'rejects set_weather_overlay with a missing or unknown layer' do
      expect(described_class.validate('set_weather_overlay', {})).not_to be_empty
      expect(described_class.validate('set_weather_overlay', { 'layer' => 'lava' }))
        .to include(a_string_matching(/layer/))
    end

    it 'rejects unknown tools' do
      expect(described_class.validate('launch_missiles', {})).to include(a_string_matching(/unknown/i))
    end
  end

  describe '.find' do
    it 'returns the tool class for a known name' do
      expect(described_class.find('fly_to')).to eq(described_class::FlyTo)
    end

    it 'is nil for unknown tools' do
      expect(described_class.find('launch_missiles')).to be_nil
    end

    it 'only the server-executed tools define .execute' do
      executable = described_class.all.select { |t| t.respond_to?(:execute) }
      expect(executable).to contain_exactly(
        described_class::PlaceMarker, described_class::DeleteMarker, described_class::SearchEntities
      )
    end
  end

  describe '.context?' do
    it 'is true only for tools whose results feed back to the model' do
      expect(described_class.context?('search_entities')).to be(true)
      expect(described_class.context?('place_marker')).to be(false)
      expect(described_class.context?('fly_to')).to be(false)
    end
  end
end
