class SimulationTickJob < ApplicationJob
  queue_as :default

  def perform(drift_degrees: nil)
    Simulation::Tick.new(drift_degrees: drift_degrees).call
  end
end
