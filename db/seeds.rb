demo = User.find_or_create_by!(email_address: 'demo@example.com') { |u| u.password = 'password123' }

SHIP_NAMES = %w[Tanker Frigate Corvette Trawler Cutter].freeze
AIRCRAFT_NAMES = %w[Falcon Raven Osprey Kestrel].freeze
VEHICLE_NAMES = %w[Convoy Patrol Rover].freeze

def seed_entities(names, kind, count, lat_range, lng_range, speed_range)
  count.times do |i|
    name = "#{names[i % names.size]}-#{i + 1}"
    next if Entity.exists?(name: name, kind: kind)

    Entity.create!(
      kind: kind, name: name,
      lat: rand(lat_range), lng: rand(lng_range),
      heading: rand(0.0..360.0), speed_knots: rand(speed_range),
      status: 'active'
    )
  end
end

# Halifax, Nova Scotia region
seed_entities(SHIP_NAMES, 'ship', 18, 44.30..44.60, -63.45..-62.90, 5.0..20.0)
seed_entities(AIRCRAFT_NAMES, 'aircraft', 12, 44.40..45.00, -64.00..-62.80, 150.0..350.0)
seed_entities(VEHICLE_NAMES, 'vehicle', 10, 44.60..44.75, -63.75..-63.50, 10.0..50.0)

# Pre-seed 24h of history (one point per 30 min) so trails render immediately
Entity.active.where.not(kind: 'marker').find_each do |entity|
  next if entity.entity_positions.any?

  lat = entity.lat
  lng = entity.lng
  48.downto(1) do |steps_ago|
    lat -= 0.002 * Math.cos(entity.heading * Math::PI / 180)
    lng -= 0.002 * Math.sin(entity.heading * Math::PI / 180)
    entity.entity_positions.create!(
      lat: lat, lng: lng, heading: entity.heading,
      recorded_at: (steps_ago * 30).minutes.ago
    )
  end
end

puts "Seeded: #{User.count} users, #{Entity.count} entities, #{EntityPosition.count} positions (demo login: demo@example.com / password123)"
