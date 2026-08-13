class RegistrationsController < ApplicationController
  allow_unauthenticated_access

  def new
    render inertia: "Auth/Register"
  end

  def create
    user = User.new(params.permit(:email_address, :password))
    if user.save
      start_new_session_for(user)
      redirect_to root_path
    else
      redirect_to new_registration_path, alert: user.errors.full_messages.to_sentence
    end
  end
end
