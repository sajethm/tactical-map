module Commands
  module Tools
    class AskClarification
      NAME = "ask_clarification".freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Ask the user a clarifying question when the command is ambiguous. Provide short choices when possible.",
          parameters: {
            type: "object",
            properties: {
              question: { type: "string" },
              choices: { type: "array", items: { type: "string" } }
            },
            required: %w[question]
          }
        }
      }.freeze

      def self.validate(args)
        args["question"].present? ? [] : [ "ask_clarification needs a question" ]
      end
    end
  end
end
