FactoryBot.define do
  factory :message do
    conversation
    role { 'user' }
    content { 'show me all ships' }
    status { 'completed' }
    actions { [] }
    context { { 'bounds' => [ -64.0, 44.0, -63.0, 45.0 ], 'selected_entity_id' => nil } }
  end
end
