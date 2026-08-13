module Commands
  module Tools
    class FilterEntities
      NAME = "filter_entities".freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: 'Filter which entities are visible on the map. Omitted fields mean "no constraint". scope "viewport" limits to the current view.',
          parameters: {
            type: "object",
            properties: {
              kinds: { type: "array", items: { type: "string", enum: Entity::KINDS } },
              statuses: { type: "array", items: { type: "string", enum: Entity::STATUSES } },
              name_contains: { type: "string" },
              scope: { type: "string", enum: %w[viewport global] }
            },
            required: []
          }
        }
      }.freeze

      def self.validate(args)
        errors = []
        Array(args["kinds"]).each { |k| errors << "unknown kind: #{k}" unless Entity::KINDS.include?(k) }
        Array(args["statuses"]).each { |s| errors << "unknown status: #{s}" unless Entity::STATUSES.include?(s) }
        errors
      end
    end
  end
end
