require 'rails_helper'

RSpec.describe 'Messages API', type: :request do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }

  before do
    post session_path, params: { email_address: user.email_address, password: 'password123' }
  end

  describe 'POST /messages' do
    it 'creates a pending user message and enqueues processing' do
      expect {
        post messages_path, params: {
          content: 'show ships',
          context: { bounds: [ -64.0, 44.0, -63.0, 45.0 ], selected_entity_id: nil }
        }, as: :json
      }.to have_enqueued_job(ProcessMessageJob)

      expect(response).to have_http_status(:created)
      message = user.current_conversation.messages.last
      expect(message.status).to eq('pending')
      expect(message.context['bounds']).to eq([ -64.0, 44.0, -63.0, 45.0 ])
    end

    it 'rejects blank content' do
      post messages_path, params: { content: '' }, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe 'GET /messages/:id' do
    it 'returns the message and its reply once present' do
      msg = create(:message, conversation: user.current_conversation, status: 'completed')
      reply = create(:message, conversation: user.current_conversation, role: 'assistant',
                               parent: msg, actions: [ { 'type' => 'clear_filters' } ])
      get message_path(msg)
      json = JSON.parse(response.body)
      expect(json['message']['status']).to eq('completed')
      expect(json['reply']['id']).to eq(reply.id)
      expect(json['reply']['actions']).to eq([ { 'type' => 'clear_filters' } ])
    end

    it "refuses other users' messages" do
      other = create(:message)
      get message_path(other)
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET /messages' do
    it 'lists conversation history ascending' do
      m1 = create(:message, conversation: user.current_conversation, content: 'first')
      m2 = create(:message, conversation: user.current_conversation, content: 'second')
      get messages_path
      json = JSON.parse(response.body)
      expect(json['messages'].map { |m| m['id'] }).to eq([ m1.id, m2.id ])
    end
  end

  describe 'GET /audit_events' do
    it 'lists recent events newest first' do
      msg = create(:message, conversation: user.current_conversation, role: 'assistant', content: 'Flying there.')
      AuditEvent.record!(user: user, message: msg, event_type: 'fly_to', payload: { 'lat' => 1.0 })
      get audit_events_path
      json = JSON.parse(response.body)
      expect(json['audit_events'].first).to include(
        'event_type' => 'fly_to', 'payload' => { 'lat' => 1.0 }
      )
    end
  end
end
