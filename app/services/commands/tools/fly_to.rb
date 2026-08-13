module Commands
  module Tools
    class FlyTo
      NAME = "fly_to".freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Move the map camera. Provide lat/lng (+ optional zoom), OR entity_id to center on an entity, OR bounds [west, south, east, north].",
          parameters: {
            type: "object",
            properties: {
              lat: { type: "number" }, lng: { type: "number" }, zoom: { type: "number" },
              entity_id: { type: "integer" },
              bounds: { type: "array", items: { type: "number" }, minItems: 4, maxItems: 4 }
            },
            required: []
          }
        }
      }.freeze

      def self.validate(args)
        has_point = args["lat"].is_a?(Numeric) && args["lng"].is_a?(Numeric)
        has_entity = args["entity_id"].is_a?(Integer)
        has_bounds = args["bounds"].is_a?(Array) && args["bounds"].size == 4 &&
                     args["bounds"].all? { |b| b.is_a?(Numeric) }
        has_point || has_entity || has_bounds ? [] : [ "fly_to needs lat/lng, entity_id, or bounds" ]
      end
    end
  end
end
