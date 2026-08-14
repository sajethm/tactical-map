class AuditEventsController < ApplicationController
  def index
    events = AuditEvent.where(user: Current.user).order(created_at: :desc).limit(100)
    render json: {
      audit_events: events.map do |e|
        { id: e.id, event_type: e.event_type, payload: e.payload, created_at: e.created_at.iso8601 }
      end
    }
  end
end
