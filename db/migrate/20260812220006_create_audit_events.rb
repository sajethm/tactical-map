class CreateAuditEvents < ActiveRecord::Migration[8.1]
  def change
    create_table :audit_events do |t|
      t.references :user, null: false, foreign_key: true
      t.references :message, foreign_key: true
      t.string :event_type, null: false
      t.jsonb :payload, null: false, default: {}
      t.timestamps
    end
    add_index :audit_events, :created_at
  end
end
