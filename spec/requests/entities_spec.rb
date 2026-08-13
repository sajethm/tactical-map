require 'rails_helper'

RSpec.describe 'Entities API', type: :request do
  let(:user) { create(:user) }

  before do
    post session_path, params: { email_address: user.email_address, password: 'password123' }
  end

  describe 'GET /entities' do
    it 'returns all entities as map JSON' do
      entity = create(:entity)
      get entities_path
      json = JSON.parse(response.body)
      expect(json['entities'].size).to eq(1)
      expect(json['entities'].first).to include('id' => entity.id, 'kind' => 'ship')
    end
  end

  describe 'GET /entities/:id/positions' do
    it 'returns history ordered oldest first' do
      entity = create(:entity)
      entity.entity_positions.create!(lat: 1.0, lng: 1.0, recorded_at: 1.hour.ago)
      entity.entity_positions.create!(lat: 2.0, lng: 2.0, recorded_at: 10.minutes.ago)
      get positions_entity_path(entity)
      json = JSON.parse(response.body)
      expect(json['positions'].map { |p| p['lat'] }).to eq([ 1.0, 2.0 ])
    end
  end

  describe 'DELETE /entities/:id' do
    it 'deletes a marker and reports its id' do
      marker = create(:entity, :marker)

      expect { delete entity_path(marker) }.to change(Entity, :count).by(-1)

      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to eq('deleted_entity_id' => marker.id)
      expect(Entity.find_by(id: marker.id)).to be_nil
    end

    it 'records an audit event describing the deleted marker' do
      marker = create(:entity, :marker, name: 'Rally point', lat: 44.5, lng: -63.5)

      delete entity_path(marker)

      event = AuditEvent.last
      expect(event.user).to eq(user)
      expect(event.event_type).to eq('delete_marker')
      expect(event.payload).to include(
        'entity_id' => marker.id, 'name' => 'Rally point', 'lat' => 44.5, 'lng' => -63.5
      )
    end

    it 'refuses to delete anything that is not a marker' do
      ship = create(:entity)

      expect { delete entity_path(ship) }.not_to change(Entity, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['error']).to match(/only markers/i)
      expect(AuditEvent.count).to eq(0)
    end

    it 'returns 404 for an unknown id' do
      delete entity_path(id: 999_999)
      expect(response).to have_http_status(:not_found)
    end

    it 'rejects unauthenticated deletion' do
      marker = create(:entity, :marker)
      delete session_path

      expect { delete entity_path(marker) }.not_to change(Entity, :count)
      expect(response).to redirect_to(new_session_path)
    end
  end

  it 'rejects unauthenticated access' do
    delete session_path
    get entities_path
    expect(response).to redirect_to(new_session_path)
  end
end
