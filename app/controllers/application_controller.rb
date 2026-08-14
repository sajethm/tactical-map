class ApplicationController < ActionController::Base
  include Authentication

  inertia_share flash: -> { { alert: flash.alert, notice: flash.notice }.compact }
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
end
