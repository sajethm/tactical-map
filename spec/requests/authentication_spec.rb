require 'rails_helper'

RSpec.describe 'Authentication', type: :request do
  describe 'GET /' do
    it 'redirects unauthenticated users to login' do
      get root_path
      expect(response).to redirect_to(new_session_path)
    end
  end

  describe 'POST /session' do
    it 'signs in with valid credentials and redirects to the dashboard' do
      user = create(:user)
      post session_path, params: { email_address: user.email_address, password: 'password123' }
      expect(response).to redirect_to(root_path)
      follow_redirect!
      expect(response).to have_http_status(:ok)
    end

    it 'redirects back to login with invalid credentials' do
      create(:user, email_address: 'a@example.com')
      post session_path, params: { email_address: 'a@example.com', password: 'wrong' }
      expect(response).to redirect_to(new_session_path)
    end
  end

  describe 'POST /registration' do
    it 'creates a user and signs them in' do
      expect {
        post registration_path, params: { email_address: 'new@example.com', password: 'password123' }
      }.to change(User, :count).by(1)
      expect(response).to redirect_to(root_path)
    end

    it 'rejects duplicate emails' do
      create(:user, email_address: 'dupe@example.com')
      post registration_path, params: { email_address: 'dupe@example.com', password: 'password123' }
      expect(response).to redirect_to(new_registration_path)
    end
  end
end
