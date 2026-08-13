require 'rails_helper'

RSpec.describe 'Dashboard', type: :request do
  it 'renders the Inertia dashboard page' do
    user = create(:user)
    post session_path, params: { email_address: user.email_address, password: 'password123' }
    get root_path
    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Dashboard')
  end
end
