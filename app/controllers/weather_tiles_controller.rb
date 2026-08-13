require "net/http"

class WeatherTilesController < ApplicationController
  OWM_LAYERS = {
    "temperature" => "temp_new",
    "precipitation" => "precipitation_new",
    "wind" => "wind_new",
    "pressure" => "pressure_new",
    "clouds" => "clouds_new"
  }.freeze

  def show
    owm_layer = OWM_LAYERS[params[:layer]]
    return head :not_found unless owm_layer

    tile = fetch_tile(owm_layer)
    return head :bad_gateway unless tile.is_a?(Net::HTTPSuccess)

    expires_in 30.minutes, public: true
    send_data tile.body, type: "image/png", disposition: "inline"
  end

  private

  def fetch_tile(owm_layer)
    uri = URI("https://tile.openweathermap.org/map/#{owm_layer}/#{params[:z]}/#{params[:x]}/#{params[:y]}.png")
    uri.query = { appid: ENV.fetch("OPENWEATHER_API_KEY", "") }.to_query
    Net::HTTP.get_response(uri)
  rescue SocketError, Timeout::Error, Errno::ECONNREFUSED
    nil
  end
end
