class Message < ApplicationRecord
  ROLES = %w[user assistant].freeze
  STATUSES = %w[pending processing completed needs_clarification failed].freeze

  belongs_to :conversation
  belongs_to :parent, class_name: "Message", optional: true
  has_many :ai_requests, dependent: :destroy
  has_many :audit_events, dependent: :nullify

  validates :role, inclusion: { in: ROLES }
  validates :status, inclusion: { in: STATUSES }

  def reply
    Message.find_by(parent_id: id)
  end

  def as_chat_json
    {
      id: id, role: role, content: content, status: status,
      actions: actions, created_at: created_at.iso8601
    }
  end
end
