require 'rails_helper'

RSpec.describe Commands::Tools::SearchEntities do
  describe '.validate' do
    it 'requires a non-empty query' do
      expect(described_class.validate({})).to include(a_string_matching(/query/))
      expect(described_class.validate({ 'query' => '  ' })).to include(a_string_matching(/query/))
    end

    it 'accepts a query alone' do
      expect(described_class.validate({ 'query' => 'Falcon' })).to be_empty
    end
  end

  describe '.execute' do
    it 'matches by case-insensitive substring anywhere on the map' do
      falcon = create(:entity, :aircraft, name: 'Falcon-1', lat: 51.15, lng: -71.67)
      create(:entity, name: 'Tanker-1')

      result = described_class.execute({ 'query' => 'falcon' })

      expect(result[:matches].map { |m| m[:id] }).to eq([ falcon.id ])
      expect(result[:matches].first).to include(
        id: falcon.id, kind: 'aircraft', name: 'Falcon-1', lat: 51.15, lng: -71.67, status: 'active'
      )
      expect(result[:truncated]).to eq(false)
    end

    it 'narrows by kinds and statuses when given' do
      create(:entity, :aircraft, name: 'Falcon-1', status: 'inactive')
      active_falcon = create(:entity, :aircraft, name: 'Falcon-2', status: 'active')

      result = described_class.execute({ 'query' => 'falcon', 'kinds' => [ 'aircraft' ], 'statuses' => [ 'active' ] })

      expect(result[:matches].map { |m| m[:id] }).to eq([ active_falcon.id ])
    end

    it 'caps results and reports truncation' do
      25.times { |i| create(:entity, name: "Falcon-#{i}") }

      result = described_class.execute({ 'query' => 'falcon' })

      expect(result[:matches].size).to eq(20)
      expect(result[:truncated]).to eq(true)
    end

    it 'is safe against ILIKE wildcard injection in the query' do
      create(:entity, name: 'Tanker-1')
      result = described_class.execute({ 'query' => '%' })
      expect(result[:matches]).to be_empty
    end
  end
end
