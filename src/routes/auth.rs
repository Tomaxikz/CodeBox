use axum::{Router, extract::State, routing::get};

use crate::routes::SharedState;

pub fn router() -> Router<SharedState> {
    Router::new().route("/health", get(health))
}


async fn health(State(state): State<SharedState>) -> &'static str {
    let _db = &state.db;

    "OK"
}