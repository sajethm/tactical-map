module Simulation
  class Tick
    TICK_SECONDS = 30.0
    HISTORY_RETENTION = 24.hours
    DRIFT_RANGE = (-8..8)

    def initialize(drift_degrees: nil)
      @drift_degrees = drift_degrees
    end

    def call
      Entity.active.where.not(kind: "marker").find_each do |entity|
        advance(entity, @drift_degrees || rand(DRIFT_RANGE))
      end
      EntityPosition.where(recorded_at: ...HISTORY_RETENTION.ago).delete_all
    end

    private

    def advance(entity, drift)
      heading = (entity.heading + drift) % 360
      distance_degrees = entity.speed_knots * (TICK_SECONDS / 3600.0) / 60.0
      radians = heading * Math::PI / 180
      lat = entity.lat + distance_degrees * Math.cos(radians)
      lng = entity.lng + distance_degrees * Math.sin(radians) / Math.cos(lat * Math::PI / 180)
      entity.update!(lat: lat, lng: lng, heading: heading)
      entity.entity_positions.create!(lat: lat, lng: lng, heading: heading, recorded_at: Time.current)
    end
  end
end
