use axum::{Router, extract::State, routing::get};

use crate::routes::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new().route("/health", get(health))
}

// Implement acutall auth routes once controllers are done
async fn health(State(state): State<SharedState>) -> &'static str {
    let _db = &state.db;

    "OK"
}