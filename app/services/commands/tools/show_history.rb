module Commands
  module Tools
    class ShowHistory
      NAME = "show_history".freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Show an entity's historical trail polyline.",
          parameters: {
            type: "object",
            properties: { entity_id: { type: "integer" } },
            required: %w[entity_id]
          }
        }
      }.freeze

      def self.validate(args)
        args["entity_id"].is_a?(Integer) ? [] : [ "#{NAME} needs entity_id" ]
      end
    end
  end
end
