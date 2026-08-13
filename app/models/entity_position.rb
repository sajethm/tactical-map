class EntityPosition < ApplicationRecord
  belongs_to :entity
  validates :lat, :lng, :recorded_at, presence: true
end
