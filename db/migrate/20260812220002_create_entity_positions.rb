class CreateEntityPositions < ActiveRecord::Migration[8.1]
  def change
    create_table :entity_positions do |t|
      t.references :entity, null: false, foreign_key: true
      t.float :lat, null: false
      t.float :lng, null: false
      t.float :heading, null: false, default: 0.0
      t.datetime :recorded_at, null: false
    end
    add_index :entity_positions, %i[entity_id recorded_at]
    add_index :entity_positions, :recorded_at
  end
end
