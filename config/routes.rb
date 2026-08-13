Rails.application.routes.draw do
  resources :messages, only: %i[index create show]
  resources :entities, only: %i[index destroy] do
    member { get :positions }
  end
  resources :audit_events, only: :index
  get "weather/tiles/:layer/:z/:x/:y", to: "weather_tiles#show",
      constraints: { z: /\d+/, x: /\d+/, y: /\d+/ }

  resource :session
  resource :registration, only: %i[new create]
  resources :passwords, param: :token

  # Redirect 127.0.0.1 to localhost so the app and the Vite dev server share an origin.
  constraints(host: "127.0.0.1") do
    get "(*path)", to: redirect { |params, req| "#{req.protocol}localhost:#{req.port}/#{params[:path]}" }
  end

  root "dashboard#show"

  get "up" => "rails/health#show", as: :rails_health_check
end
