ALTER TABLE "game_moves" DROP CONSTRAINT "game_moves_session_id_game_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "game_moves" DROP CONSTRAINT "game_moves_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "game_players" DROP CONSTRAINT "game_players_session_id_game_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "game_players" DROP CONSTRAINT "game_players_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_session_id_game_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "game_moves_session_version_idx" ON "game_moves" USING btree ("session_id","state_version_after");--> statement-breakpoint
CREATE UNIQUE INDEX "game_players_session_user_idx" ON "game_players" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "game_players_session_seat_idx" ON "game_players" USING btree ("session_id","seat");