require 'rails_helper'

RSpec.describe Entity, type: :model do
  describe 'validations' do
    it 'requires kind, name, lat, lng' do
      expect(Entity.new).not_to be_valid
      expect(create(:entity)).to be_valid
    end

    it 'rejects unknown kinds' do
      expect(build(:entity, kind: 'submarine')).not_to be_valid
    end
  end

  describe '.within_bounds' do
    it 'returns only entities inside the bounding box' do
      inside = create(:entity, lat: 44.6, lng: -63.5)
      create(:entity, lat: 50.0, lng: -70.0)
      expect(Entity.within_bounds(-64.0, 44.0, -63.0, 45.0)).to contain_exactly(inside)
    end
  end

  describe '#marker?' do
    it 'is true only for markers' do
      expect(create(:entity, :marker)).to be_marker
      expect(create(:entity)).not_to be_marker
      expect(create(:entity, :aircraft)).not_to be_marker
    end
  end

  describe '#as_map_json' do
    it 'serializes map fields' do
      entity = create(:entity)
      expect(entity.as_map_json).to include(
        id: entity.id, kind: 'ship', name: entity.name, lat: 44.55, lng: -63.4
      )
    end
  end
end
