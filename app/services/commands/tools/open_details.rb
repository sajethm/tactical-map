module Commands
  module Tools
    class OpenDetails
      NAME = "open_details".freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Open an entity's details panel.",
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
