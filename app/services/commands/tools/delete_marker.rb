module Commands
  module Tools
    class DeleteMarker
      NAME = "delete_marker".freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Permanently delete a marker the operator placed. Only entities " \
                       "of kind \"marker\" can be deleted — ships, aircraft, and vehicles " \
                       "cannot be removed this way.",
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

      def self.execute(args, context: {})
        entity = Entity.find_by(id: args["entity_id"])
        return args.merge("deleted" => false, "reason" => "not_found") if entity.nil?

        unless entity.marker?
          return args.merge("deleted" => false, "reason" => "not_a_marker", "name" => entity.name)
        end

        name = entity.name
        entity.destroy!
        args.merge("deleted" => true, "name" => name)
      end
    end
  end
end
