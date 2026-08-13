module Commands
  class ProcessMessage
    def initialize(message)
      @message = message
    end

    def call
      @message.update!(status: "processing")
      result = RequestCompletion.new(@message).call
      ApplyActions.new(@message, result).call
    rescue StandardError => e
      Rails.logger.error("Commands::ProcessMessage failed for message #{@message.id}: #{e.class} #{e.message}")
      @message.update!(status: "failed")
    end
  end
end
