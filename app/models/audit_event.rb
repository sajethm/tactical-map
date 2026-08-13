class AuditEvent < ApplicationRecord
  belongs_to :user
  belongs_to :message, optional: true

  validates :event_type, presence: true

  def self.record!(user:, event_type:, payload: {}, message: nil)
    create!(user: user, message: message, event_type: event_type, payload: payload)
  end
end
