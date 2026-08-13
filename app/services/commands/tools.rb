module Commands
  module Tools
    def self.all
      [ FlyTo, FilterEntities, PlaceMarker, ShowHistory, OpenDetails, ClearFilters,
        AskClarification, SearchEntities, SetWeatherOverlay, DeleteMarker ]
    end

    def self.schemas
      all.map { |t| t::SCHEMA }
    end

    def self.validate(name, args)
      tool = find(name)
      tool ? tool.validate(args) : [ "unknown tool: #{name}" ]
    end

    def self.context_tools
      [ SearchEntities ]
    end

    def self.context?(name)
      context_tools.any? { |t| t::NAME == name }
    end

    def self.find(name)
      all.find { |t| t::NAME == name }
    end
  end
end
