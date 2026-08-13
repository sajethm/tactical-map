class User < ApplicationRecord
  has_secure_password
  has_many :sessions, dependent: :destroy
  has_many :conversations, dependent: :destroy

  normalizes :email_address, with: ->(e) { e.strip.downcase }

  validates :email_address, presence: true, uniqueness: true
  validates :password, length: { minimum: 8 }, allow_nil: true

  def current_conversation
    conversations.order(:created_at).first_or_create!
  end
end
