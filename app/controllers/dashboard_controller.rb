class DashboardController < ApplicationController
  def show
    render inertia: "Dashboard", props: {
      mapboxToken: ENV.fetch("MAPBOX_ACCESS_TOKEN", ""),
      initialEntities: Entity.order(:id).map(&:as_map_json),
      initialMessages: Current.user.current_conversation.messages.order(:created_at).map(&:as_chat_json)
    }
  end
end
