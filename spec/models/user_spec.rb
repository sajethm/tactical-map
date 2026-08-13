require 'rails_helper'

RSpec.describe User, type: :model do
  it 'requires a unique email address' do
    create(:user, email_address: 'taken@example.com')
    expect(build(:user, email_address: 'taken@example.com')).not_to be_valid
  end

  it 'requires passwords of at least 8 characters' do
    expect(build(:user, password: 'short')).not_to be_valid
    expect(build(:user, password: 'password123')).to be_valid
  end
end
