use axum::{Router, routing::get};

use crate::app::state::AppState;

mod auth;

pub fn router() -> Router<AppState> {
    Router::new()
        .nest("/api/auth", auth::router())
}