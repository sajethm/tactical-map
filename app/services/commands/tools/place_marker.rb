module Commands
  module Tools
    class PlaceMarker
      NAME = "place_marker".freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Create a named marker at a coordinate.",
          parameters: {
            type: "object",
            properties: { lat: { type: "number" }, lng: { type: "number" }, name: { type: "string" } },
            required: %w[lat lng name]
          }
        }
      }.freeze

      def self.validate(args)
        %w[lat lng name].filter_map { |key| "place_marker missing #{key}" if args[key].blank? && args[key] != 0 }
      end

      def self.execute(args, context:)
        marker = Entity.create_with(
          lat: args["lat"], lng: args["lng"], created_by: context[:user],
          properties: { "source_message_id" => context[:message].id }
        ).find_or_create_by!(kind: "marker", name: args["name"],
                             properties: { "source_message_id" => context[:message].id })
        args.merge("entity_id" => marker.id)
      end
    end
  end
end
