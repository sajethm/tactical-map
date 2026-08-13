class ProcessMessageJob < ApplicationJob
  queue_as :default

  def perform(message)
    Commands::ProcessMessage.new(message).call
  end
end
