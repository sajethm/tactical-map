require 'rails_helper'

RSpec.describe Message, type: :model do
  it 'validates role and status' do
    expect(build(:message, role: 'system')).not_to be_valid
    expect(build(:message, status: 'bogus')).not_to be_valid
    expect(build(:message)).to be_valid
  end

  describe '#reply' do
    it 'returns the assistant message linked via parent_id' do
      user_msg = create(:message)
      reply = create(:message, conversation: user_msg.conversation, role: 'assistant',
                               parent: user_msg, content: 'done')
      expect(user_msg.reply).to eq(reply)
    end
  end

  describe 'User#current_conversation' do
    it 'creates one conversation and reuses it' do
      user = create(:user)
      convo = user.current_conversation
      expect(user.current_conversation).to eq(convo)
      expect(user.conversations.count).to eq(1)
    end
  end

  describe 'AuditEvent.record!' do
    it 'writes an event row' do
      msg = create(:message)
      expect {
        AuditEvent.record!(user: msg.conversation.user, message: msg,
                           event_type: 'fly_to', payload: { 'lat' => 1.0 })
      }.to change(AuditEvent, :count).by(1)
    end
  end
end
