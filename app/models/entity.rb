class Entity < ApplicationRecord
  KINDS = %w[ship aircraft vehicle marker].freeze
  STATUSES = %w[active inactive].freeze

  belongs_to :created_by, class_name: "User", optional: true
  has_many :entity_positions, dependent: :delete_all

  validates :kind, inclusion: { in: KINDS }
  validates :status, inclusion: { in: STATUSES }
  validates :name, :lat, :lng, presence: true

  scope :active, -> { where(status: "active") }
  scope :within_bounds, ->(w, s, e, n) { where(lat: s..n, lng: w..e) }

  def as_map_json
    {
      id: id, kind: kind, name: name, lat: lat, lng: lng,
      heading: heading, speed_knots: speed_knots, status: status,
      properties: properties
    }
  end

  def marker?
    kind == "marker"
  end
end
