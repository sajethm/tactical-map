module Commands
  class Prompt
    HISTORY_LIMIT = 10
    VISIBLE_ENTITY_LIMIT = 50

    SYSTEM = <<~PROMPT.freeze
      You are the command interpreter for a tactical map application. Translate the
      user's natural-language command into an ordered sequence of tool calls.

      Rules:
      - Emit tool calls in the order they should execute on the map (e.g. fly first,
        then filter, then open details).
      - When the user asks to see, find, or locate one specific entity by name
        (e.g. "show me X", "where is X", "find X"), pair fly_to with
        open_details for that entity so they see both its position and its
        info panel, not just a camera move.
      - A single command may require several tool calls.
      - When the command is ambiguous (an unresolvable reference like "this asset"
        with nothing selected, or several entities match a name), call
        ask_clarification with a short question and concrete choices instead of guessing.
      - If a named entity the user refers to is not in the Visible entities list
        below, call search_entities with its name before giving up — it searches
        the whole map, not just the current viewport. Call it on its own, without
        other tools: its results come back to you, and you emit the map actions
        with the returned ids in your next reply. Only fall back to
        ask_clarification if the search also finds no match or several equally
        plausible matches.
      - When the user says "here", "in view", or gives no area, assume the current
        viewport and say so briefly in your reply text.
      - Resolve pronouns ("it", "its") using the conversation history and the
        selected entity.
      - Entity ids in the context, or returned by search_entities, are
        authoritative — never invent ids.
      - For weather requests, call set_weather_overlay. Layers: temperature,
        precipitation, wind, pressure, clouds. If the user asks for "weather"
        without naming a layer, default to temperature and say so in your reply.
        Use layer "none" when the user asks to hide weather.
      - Deletion is permanent and limited to markers. Use delete_marker only for
        entities whose kind is "marker". If the user asks to delete a ship,
        aircraft, or vehicle, do not call the tool — say that only markers can be
        deleted. If it is unclear which marker they mean, call ask_clarification
        with the candidate names first.
      - Always include a short reply text summarizing what you did or asking the question.
    PROMPT

    def initialize(message)
      @message = message
    end

    def messages
      [ { role: "system", content: SYSTEM } ] + history + [ { role: "user", content: user_content } ]
    end

    def to_log
      messages.map { |m| "#{m[:role]}:\n#{m[:content]}" }.join("\n\n---\n\n")
    end

    private

    def history
      @message.conversation.messages
              .where.not(id: @message.id)
              .order(created_at: :desc).limit(HISTORY_LIMIT)
              .reverse
              .map { |m| { role: m.role, content: m.content } }
    end

    def user_content
      <<~CONTENT
        #{@message.content}

        --- MAP CONTEXT ---
        Viewport bounds [west, south, east, north]: #{bounds.inspect}
        #{selected_entity_line}
        Visible entities (id | kind | name | lat | lng | speed_knots | status):
        #{visible_entities_block}
      CONTENT
    end

    def bounds
      @message.context["bounds"] || [ -180, -90, 180, 90 ]
    end

    def selected_entity_line
      id = @message.context["selected_entity_id"]
      entity = id && Entity.find_by(id: id)
      entity ? "Currently selected entity: #{entity.id} (#{entity.name})" : "No entity currently selected."
    end

    def visible_entities_block
      entities = Entity.within_bounds(*bounds).limit(VISIBLE_ENTITY_LIMIT)
      return "(none)" if entities.empty?

      entities.map do |e|
        "#{e.id} | #{e.kind} | #{e.name} | #{e.lat.round(4)} | #{e.lng.round(4)} | #{e.speed_knots} | #{e.status}"
      end.join("\n")
    end
  end
end
