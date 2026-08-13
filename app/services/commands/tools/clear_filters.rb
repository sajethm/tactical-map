module Commands
  module Tools
    class ClearFilters
      NAME = "clear_filters".freeze
      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Remove all active filters.",
          parameters: { type: "object", properties: {}, required: [] }
        }
      }.freeze

      def self.validate(_args)
        []
      end
    end
  end
end
