require 'rails_helper'

RSpec.describe Simulation::Tick do
  it 'moves an entity north by the distance covered in 30 seconds' do
    entity = create(:entity, lat: 44.0, lng: -63.0, heading: 0.0, speed_knots: 60.0)
    described_class.new(drift_degrees: 0).call
    entity.reload
    # 60 knots * 30s = 0.5 nm = 0.5/60 degrees latitude
    expect(entity.lat).to be_within(0.0001).of(44.0 + 0.5 / 60)
    expect(entity.lng).to be_within(0.0001).of(-63.0)
  end

  it 'appends a position history row' do
    entity = create(:entity)
    expect { described_class.new(drift_degrees: 0).call }
      .to change { entity.entity_positions.count }.by(1)
  end

  it 'does not move markers or inactive entities' do
    marker = create(:entity, :marker, lat: 44.0)
    inactive = create(:entity, status: 'inactive', lat: 44.0)
    described_class.new(drift_degrees: 0).call
    expect(marker.reload.lat).to eq(44.0)
    expect(inactive.reload.lat).to eq(44.0)
  end

  it 'prunes positions older than 24 hours' do
    entity = create(:entity)
    old = entity.entity_positions.create!(lat: 1.0, lng: 1.0, recorded_at: 25.hours.ago)
    entity.entity_positions.create!(lat: 1.0, lng: 1.0, recorded_at: 1.hour.ago)
    described_class.new(drift_degrees: 0).call
    expect(EntityPosition.exists?(old.id)).to be(false)
    expect(entity.entity_positions.count).to eq(2)
  end
end
