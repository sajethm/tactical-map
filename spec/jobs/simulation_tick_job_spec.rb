require 'rails_helper'

RSpec.describe SimulationTickJob, type: :job do
  it 'delegates to Simulation::Tick with the given drift_degrees' do
    tick = instance_double(Simulation::Tick, call: nil)
    expect(Simulation::Tick).to receive(:new).with(drift_degrees: 5).and_return(tick)
    described_class.new.perform(drift_degrees: 5)
    expect(tick).to have_received(:call)
  end
end
