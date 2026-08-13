class EntitiesController < ApplicationController
  def index
    render json: { entities: Entity.order(:id).map(&:as_map_json) }
  end

  def positions
    positions = Entity.find(params[:id]).entity_positions.order(:recorded_at)
    render json: {
      positions: positions.map { |p| { lat: p.lat, lng: p.lng, recorded_at: p.recorded_at.iso8601 } }
    }
  end

  def destroy
    entity = Entity.find(params[:id])

    unless entity.marker?
      return render json: { error: "Only markers can be deleted." }, status: :unprocessable_entity
    end

    AuditEvent.record!(
      user: Current.user, event_type: "delete_marker",
      payload: { "entity_id" => entity.id, "name" => entity.name,
                 "lat" => entity.lat.to_f, "lng" => entity.lng.to_f }
    )
    entity.destroy!
    render json: { deleted_entity_id: entity.id }
  end
end
