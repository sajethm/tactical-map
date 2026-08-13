# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_08_12_220006) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "ai_requests", force: :cascade do |t|
    t.integer "completion_tokens"
    t.datetime "created_at", null: false
    t.text "error"
    t.bigint "message_id", null: false
    t.string "model"
    t.text "prompt"
    t.integer "prompt_tokens"
    t.jsonb "response"
    t.datetime "updated_at", null: false
    t.index ["message_id"], name: "index_ai_requests_on_message_id"
  end

  create_table "audit_events", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "event_type", null: false
    t.bigint "message_id"
    t.jsonb "payload", default: {}, null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["created_at"], name: "index_audit_events_on_created_at"
    t.index ["message_id"], name: "index_audit_events_on_message_id"
    t.index ["user_id"], name: "index_audit_events_on_user_id"
  end

  create_table "conversations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_conversations_on_user_id"
  end

  create_table "entities", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "created_by_id"
    t.float "heading", default: 0.0, null: false
    t.string "kind", null: false
    t.float "lat", null: false
    t.float "lng", null: false
    t.string "name", null: false
    t.jsonb "properties", default: {}, null: false
    t.float "speed_knots", default: 0.0, null: false
    t.string "status", default: "active", null: false
    t.datetime "updated_at", null: false
    t.index ["created_by_id"], name: "index_entities_on_created_by_id"
    t.index ["kind"], name: "index_entities_on_kind"
    t.index ["status"], name: "index_entities_on_status"
  end

  create_table "entity_positions", force: :cascade do |t|
    t.bigint "entity_id", null: false
    t.float "heading", default: 0.0, null: false
    t.float "lat", null: false
    t.float "lng", null: false
    t.datetime "recorded_at", null: false
    t.index ["entity_id", "recorded_at"], name: "index_entity_positions_on_entity_id_and_recorded_at"
    t.index ["entity_id"], name: "index_entity_positions_on_entity_id"
    t.index ["recorded_at"], name: "index_entity_positions_on_recorded_at"
  end

  create_table "messages", force: :cascade do |t|
    t.jsonb "actions", default: [], null: false
    t.text "content", default: "", null: false
    t.jsonb "context", default: {}, null: false
    t.bigint "conversation_id", null: false
    t.datetime "created_at", null: false
    t.bigint "parent_id"
    t.string "role", null: false
    t.string "status", default: "completed", null: false
    t.datetime "updated_at", null: false
    t.index ["conversation_id", "created_at"], name: "index_messages_on_conversation_id_and_created_at"
    t.index ["conversation_id"], name: "index_messages_on_conversation_id"
    t.index ["parent_id"], name: "index_messages_on_parent_id"
  end

  create_table "sessions", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "ip_address"
    t.datetime "updated_at", null: false
    t.string "user_agent"
    t.bigint "user_id", null: false
    t.index ["user_id"], name: "index_sessions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email_address", null: false
    t.string "password_digest", null: false
    t.datetime "updated_at", null: false
    t.index ["email_address"], name: "index_users_on_email_address", unique: true
  end

  add_foreign_key "ai_requests", "messages"
  add_foreign_key "audit_events", "messages"
  add_foreign_key "audit_events", "users"
  add_foreign_key "conversations", "users"
  add_foreign_key "entities", "users", column: "created_by_id"
  add_foreign_key "entity_positions", "entities"
  add_foreign_key "messages", "conversations"
  add_foreign_key "messages", "messages", column: "parent_id"
  add_foreign_key "sessions", "users"
end
