module Commands
  module Tools
    class SetWeatherOverlay
      NAME = "set_weather_overlay".freeze
      LAYERS = %w[temperature precipitation wind pressure clouds none].freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Show a weather overlay on the map, or hide it with layer 'none'. " \
                       "The overlay covers whatever the map shows, including the current zoom window.",
          parameters: {
            type: "object",
            properties: { layer: { type: "string", enum: LAYERS } },
            required: [ "layer" ]
          }
        }
      }.freeze

      def self.validate(args)
        LAYERS.include?(args["layer"]) ? [] : [ "set_weather_overlay layer must be one of: #{LAYERS.join(', ')}" ]
      end
    end
  end
end
