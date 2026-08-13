module Commands
  class ApplyActions
    def initialize(message, result)
      @message = message
      @user = message.conversation.user
      @result = result
    end

    def call
      actions = @result.tool_calls.map { |tc| apply_side_effects(tc[:name], tc[:args]).merge("type" => tc[:name]) }
      reply = create_reply(actions)
      record_audit_events(reply, actions)
      clarifying = actions.any? { |a| a["type"] == "ask_clarification" }
      @message.update!(status: clarifying ? "needs_clarification" : "completed")
      reply
    end

    private

    def apply_side_effects(name, args)
      tool = Tools.find(name)
      return args unless tool.respond_to?(:execute)

      tool.execute(args, context: { user: @user, message: @message })
    end

    def create_reply(actions)
      reply_text = @result.content.presence || "Done."
      Message.create!(
        conversation: @message.conversation, parent: @message, role: "assistant",
        content: reply_text, actions: actions, status: "completed"
      )
    end

    def record_audit_events(reply, actions)
      actions.each do |action|
        AuditEvent.record!(user: @user, message: reply,
                           event_type: action["type"], payload: action.except("type"))
      end
    end
  end
end
