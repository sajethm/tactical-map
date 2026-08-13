require 'rails_helper'

RSpec.describe 'Weather tiles proxy', type: :request do
  let(:user) { create(:user) }

  around do |example|
    original = ENV['OPENWEATHER_API_KEY']
    ENV['OPENWEATHER_API_KEY'] = 'test-key'
    example.run
    ENV['OPENWEATHER_API_KEY'] = original
  end

  before do
    post session_path, params: { email_address: user.email_address, password: 'password123' }
  end

  it 'proxies a known layer to OpenWeather and returns the tile with cache headers' do
    stub_request(:get, 'https://tile.openweathermap.org/map/temp_new/3/2/1.png')
      .with(query: { appid: 'test-key' })
      .to_return(status: 200, body: 'PNGBYTES', headers: { 'Content-Type' => 'image/png' })

    get '/weather/tiles/temperature/3/2/1'

    expect(response).to have_http_status(:ok)
    expect(response.body).to eq('PNGBYTES')
    expect(response.headers['Content-Type']).to include('image/png')
    expect(response.headers['Cache-Control']).to include('public')
  end

  it 'maps every user-facing layer to its OpenWeather tile name' do
    {
      'precipitation' => 'precipitation_new', 'wind' => 'wind_new',
      'pressure' => 'pressure_new', 'clouds' => 'clouds_new'
    }.each do |layer, owm|
      stub = stub_request(:get, "https://tile.openweathermap.org/map/#{owm}/1/0/0.png")
        .with(query: { appid: 'test-key' }).to_return(status: 200, body: 'x')
      get "/weather/tiles/#{layer}/1/0/0"
      expect(stub).to have_been_requested
    end
  end

  it 'returns 404 for unknown layers without calling OpenWeather' do
    get '/weather/tiles/lava/3/2/1'
    expect(response).to have_http_status(:not_found)
  end

  it 'returns 502 when OpenWeather fails' do
    stub_request(:get, %r{tile\.openweathermap\.org}).to_return(status: 500)
    get '/weather/tiles/temperature/3/2/1'
    expect(response).to have_http_status(:bad_gateway)
  end

  it 'redirects unauthenticated requests to sign-in' do
    delete session_path
    get '/weather/tiles/temperature/3/2/1'
    expect(response).to redirect_to(new_session_path)
  end
end
