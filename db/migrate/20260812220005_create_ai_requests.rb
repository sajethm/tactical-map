class CreateAiRequests < ActiveRecord::Migration[8.1]
  def change
    create_table :ai_requests do |t|
      t.references :message, null: false, foreign_key: true
      t.text :prompt
      t.jsonb :response
      t.string :model
      t.integer :prompt_tokens
      t.integer :completion_tokens
      t.text :error
      t.timestamps
    end
  end
end
