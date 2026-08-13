FactoryBot.define do
  factory :entity do
    kind { 'ship' }
    sequence(:name) { |n| "Tanker-#{n}" }
    lat { 44.55 }
    lng { -63.40 }
    heading { 90.0 }
    speed_knots { 12.0 }
    status { 'active' }
    properties { {} }

    trait :aircraft do
      kind { 'aircraft' }
      sequence(:name) { |n| "Falcon-#{n}" }
      speed_knots { 250.0 }
    end

    trait :vehicle do
      kind { 'vehicle' }
      sequence(:name) { |n| "Convoy-#{n}" }
      speed_knots { 40.0 }
    end

    trait :marker do
      kind { 'marker' }
      sequence(:name) { |n| "Marker-#{n}" }
      speed_knots { 0.0 }
    end
  end
end
