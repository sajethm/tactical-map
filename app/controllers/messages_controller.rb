class MessagesController < ApplicationController
  def index
    render json: { messages: conversation.messages.order(:created_at).map(&:as_chat_json) }
  end

  def create
    content = params[:content].to_s.strip
    return render json: { error: "content required" }, status: :unprocessable_entity if content.blank?

    message = conversation.messages.create!(
      role: "user", content: content, status: "pending",
      context: context_params
    )
    ProcessMessageJob.perform_later(message)
    render json: { message: message.as_chat_json }, status: :created
  end

  def show
    message = conversation.messages.find(params[:id])
    render json: { message: message.as_chat_json, reply: message.reply&.as_chat_json }
  rescue ActiveRecord::RecordNotFound
    head :not_found
  end

  private

  def conversation
    Current.user.current_conversation
  end

  def context_params
    raw = params[:context] || {}
    { "bounds" => raw[:bounds]&.map(&:to_f), "selected_entity_id" => raw[:selected_entity_id] }
  end
end
