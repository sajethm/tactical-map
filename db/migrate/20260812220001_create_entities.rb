class CreateEntities < ActiveRecord::Migration[8.1]
  def change
    create_table :entities do |t|
      t.string :kind, null: false
      t.string :name, null: false
      t.float :lat, null: false
      t.float :lng, null: false
      t.float :heading, null: false, default: 0.0
      t.float :speed_knots, null: false, default: 0.0
      t.string :status, null: false, default: 'active'
      t.jsonb :properties, null: false, default: {}
      t.references :created_by, foreign_key: { to_table: :users }
      t.timestamps
    end
    add_index :entities, :kind
    add_index :entities, :status
  end
end
