class CreateMessages < ActiveRecord::Migration[8.1]
  def change
    create_table :messages do |t|
      t.references :conversation, null: false, foreign_key: true
      t.references :parent, foreign_key: { to_table: :messages }
      t.string :role, null: false
      t.text :content, null: false, default: ''
      t.string :status, null: false, default: 'completed'
      t.jsonb :actions, null: false, default: []
      t.jsonb :context, null: false, default: {}
      t.timestamps
    end
    add_index :messages, %i[conversation_id created_at]
  end
end
