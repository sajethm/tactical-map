module Commands
  module Tools
    class SearchEntities
      NAME = "search_entities".freeze
      RESULT_LIMIT = 20

      SCHEMA = {
        type: "function",
        function: {
          name: NAME,
          description: "Look up entities anywhere on the map (not just the current " \
                        "viewport) by name and optionally kind/status. Use this when a " \
                        "named entity is not in the Visible entities list, before " \
                        "asking for clarification. Call it alone — the matches come " \
                        "back to you, then you emit map actions (fly_to, open_details, " \
                        "…) with the returned ids in your next reply. It never moves " \
                        "the map or produces a visible action by itself.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Case-insensitive substring to match against entity name." },
              kinds: { type: "array", items: { type: "string", enum: Entity::KINDS } },
              statuses: { type: "array", items: { type: "string", enum: Entity::STATUSES } }
            },
            required: %w[query]
          }
        }
      }.freeze

      def self.validate(args)
        args["query"].is_a?(String) && args["query"].strip.present? ? [] : [ "#{NAME} needs a non-empty query" ]
      end

      def self.execute(args, context: {})
        like_query = ActiveRecord::Base.sanitize_sql_like(args["query"].to_s)
        scope = Entity.where("name ILIKE ?", "%#{like_query}%")
        scope = scope.where(kind: args["kinds"]) if args["kinds"].present?
        scope = scope.where(status: args["statuses"]) if args["statuses"].present?
        scope = scope.order(:name)

        matches = scope.limit(RESULT_LIMIT).map do |e|
          { id: e.id, kind: e.kind, name: e.name, lat: e.lat.round(4), lng: e.lng.round(4), status: e.status }
        end

        { matches: matches, truncated: scope.limit(RESULT_LIMIT + 1).count > RESULT_LIMIT }
      end
    end
  end
end
